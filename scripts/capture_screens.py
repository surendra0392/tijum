#!/usr/bin/env python3
"""
TIJUM Mobile Authenticated Visual QA & End-to-End Verification Harness.

Spins up an isolated SQLite Laravel backend (with all live financial controls
disabled), seeds deterministic customer/partner/empty fixtures with ephemeral
per-run credentials, exports the Expo web client pointed at a local reverse
proxy, and drives headless Chrome over CDP (`scripts/cdp_verify_and_capture.mjs`)
to:
  1. Authenticate as real Customer and Partner accounts via Sanctum APIs.
  2. Capture populated, verified screenshots of all 23 core screens (failing
     hard on unexpected API errors, sign-in gates, uncaught JS exceptions,
     broken images, or horizontal overflow).
  3. Separately capture legitimate empty, auth-gate, and simulated API-error
     states under `docs/mobile/screenshots/states/`.
  4. Execute real end-to-end backend mutations (UI login, booking hold &
     cancellation, support case submission, partner property creation,
     physical room inventory addition, front-desk check-in/out, KYC update)
     and assert backend persistence after every mutation.
"""

import http.client
import json
import mimetypes
import os
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MOBILE_DIR = REPO_ROOT / "apps" / "mobile"
SCREENSHOTS_DIR = Path(os.environ.get("QA_SCREENSHOTS_DIR") or REPO_ROOT / "docs" / "mobile" / "screenshots").resolve()
PUBLIC_DIR = REPO_ROOT / "public"
SEEDER_SCRIPT = REPO_ROOT / "scripts" / "seed_mobile_qa.php"
CDP_SCRIPT = REPO_ROOT / "scripts" / "cdp_verify_and_capture.mjs"

CHROME_CANDIDATES = [
    Path(os.environ.get("CHROME_PATH", "")) if os.environ.get("CHROME_PATH") else None,
    Path("C:/Program Files/Google/Chrome/Application/chrome.exe"),
    Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"),
    Path("/usr/bin/google-chrome"),
    Path("/usr/bin/chromium"),
    Path("/usr/bin/chromium-browser"),
]


def find_chrome() -> Path:
    for candidate in CHROME_CANDIDATES:
        if candidate and candidate.is_file():
            return candidate
    raise RuntimeError(
        "Chrome/Chromium executable not found. Set CHROME_PATH environment variable."
    )


def find_free_port(preferred: int) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(("127.0.0.1", preferred)) != 0:
            return preferred
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def make_qa_proxy_handler(dist_dir: Path, storage_public_dir: Path, backend_port: int, state: dict):
    class QaProxySpaHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(dist_dir), **kwargs)

        def log_message(self, format, *args):
            # Suppress noisy static asset logs unless debugging
            if os.environ.get("QA_VERBOSE_HTTP") == "1":
                super().log_message(format, *args)

        def _send_static_file(self, base_dir: Path, rel_path: str) -> bool:
            try:
                resolved_base = base_dir.resolve()
                target = (base_dir / rel_path.lstrip("/")).resolve()
                if not str(target).startswith(str(resolved_base)) or not target.is_file():
                    return False
                ctype, _ = mimetypes.guess_type(str(target))
                data = target.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", ctype or "application/octet-stream")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(data)
                return True
            except Exception:
                return False

        def _handle_control(self) -> bool:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path != "/__qa/simulate-error":
                return False
            qs = urllib.parse.parse_qs(parsed.query)
            state["simulate_api_error"] = qs.get("on", ["0"])[0] == "1"
            payload = json.dumps(
                {"ok": True, "simulate_api_error": state["simulate_api_error"]}
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return True

        def _proxy_api(self):
            if state.get("simulate_api_error"):
                payload = json.dumps(
                    {
                        "success": False,
                        "message": "Service temporarily unavailable (simulated QA 503 outage).",
                        "error_code": "SIMULATED_OUTAGE",
                    }
                ).encode("utf-8")
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return

            content_length = int(self.headers.get("Content-Length", "0") or "0")
            body = self.rfile.read(content_length) if content_length > 0 else None

            forward_headers = {}
            for key, val in self.headers.items():
                lower = key.lower()
                if lower in ("host", "accept-encoding", "connection", "content-length"):
                    continue
                forward_headers[key] = val
            if body is not None:
                forward_headers["Content-Length"] = str(len(body))

            conn = http.client.HTTPConnection("127.0.0.1", backend_port, timeout=25)
            try:
                conn.request(self.command, self.path, body=body, headers=forward_headers)
                resp = conn.getresponse()
                resp_body = resp.read()
                self.send_response(resp.status, resp.reason)
                for h_key, h_val in resp.getheaders():
                    h_lower = h_key.lower()
                    if h_lower in ("transfer-encoding", "connection", "content-length"):
                        continue
                    self.send_header(h_key, h_val)
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)
            except Exception as exc:
                payload = json.dumps(
                    {"success": False, "message": f"QA proxy error: {exc}"}
                ).encode("utf-8")
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            finally:
                conn.close()

        def do_OPTIONS(self):
            if self.path.startswith("/api/"):
                self._proxy_api()
                return
            self.send_response(204)
            self.end_headers()

        def do_POST(self):
            if self.path.startswith("/api/"):
                self._proxy_api()
                return
            self.send_error(405)

        def do_PUT(self):
            if self.path.startswith("/api/"):
                self._proxy_api()
                return
            self.send_error(405)

        def do_PATCH(self):
            if self.path.startswith("/api/"):
                self._proxy_api()
                return
            self.send_error(405)

        def do_DELETE(self):
            if self.path.startswith("/api/"):
                self._proxy_api()
                return
            self.send_error(405)

        def do_GET(self):
            if self._handle_control():
                return
            if self.path.startswith("/api/"):
                self._proxy_api()
                return

            req_path = urllib.parse.urlparse(self.path).path

            # Serve Laravel public media directly so images render reliably on Windows
            if req_path.startswith("/storage/"):
                if self._send_static_file(storage_public_dir, req_path[len("/storage/"):]):
                    return
            if req_path.startswith("/images/") or req_path.startswith("/brand/"):
                if self._send_static_file(PUBLIC_DIR, req_path.lstrip("/")):
                    return

            # Serve compiled Expo web assets or fall back to SPA index.html
            local_file = dist_dir / req_path.lstrip("/")
            if local_file.is_file():
                return super().do_GET()

            self.path = "/index.html"
            return super().do_GET()

    return QaProxySpaHandler


def wait_for_backend(backend_port: int, timeout_s: float = 20.0) -> None:
    deadline = time.time() + timeout_s
    last_err = None
    while time.time() < deadline:
        try:
            conn = http.client.HTTPConnection("127.0.0.1", backend_port, timeout=3)
            conn.request(
                "GET",
                "/api/v1/public/cities",
                headers={"Accept": "application/json"},
            )
            resp = conn.getresponse()
            resp.read()
            conn.close()
            if resp.status == 200:
                return
            last_err = f"HTTP {resp.status}"
        except Exception as exc:
            last_err = str(exc)
        time.sleep(0.35)
    raise RuntimeError(
        f"Isolated Laravel QA backend on port {backend_port} did not become healthy: {last_err}"
    )


def verify_bundle_api_url(dist_dir: Path, expected_api_url: str) -> None:
    js_files = list(dist_dir.rglob("*.js"))
    for js_file in js_files:
        try:
            content = js_file.read_text(encoding="utf-8", errors="ignore")
            if expected_api_url in content:
                return
        except Exception:
            continue
    raise RuntimeError(
        f"Expo web bundle in {dist_dir} does not contain expected EXPO_PUBLIC_API_URL "
        f"({expected_api_url}). Check static dot-notation process.env.EXPO_PUBLIC_API_URL."
    )


def clean_stale_screenshots(screenshots_dir: Path) -> None:
    screenshots_dir.mkdir(parents=True, exist_ok=True)
    for png in screenshots_dir.glob("*.png"):
        png.unlink()
    states_dir = screenshots_dir / "states"
    if states_dir.exists():
        for png in states_dir.glob("*.png"):
            png.unlink()
    manifest = screenshots_dir / "verification_manifest.json"
    if manifest.exists():
        manifest.unlink()


def terminate_process(proc: subprocess.Popen | None) -> None:
    if not proc or proc.poll() is not None:
        return
    try:
        proc.terminate()
        proc.wait(timeout=5)
    except Exception:
        try:
            proc.kill()
            proc.wait(timeout=3)
        except Exception:
            pass


def main() -> int:
    chrome_path = find_chrome()
    tmp_dir = Path(tempfile.mkdtemp(prefix="tijum_mobile_qa_"))
    qa_db_path = tmp_dir / "mobile_qa.sqlite"
    qa_db_path.touch()
    storage_dir = tmp_dir / "storage"
    (storage_dir / "framework" / "views").mkdir(parents=True)
    storage_public_dir = storage_dir / "app" / "public"
    dist_dir = tmp_dir / "dist-web-qa"
    chrome_profile = tmp_dir / "chrome-profile"
    config_file = tmp_dir / "cdp_config.json"

    backend_port = find_free_port(8091)
    proxy_port = find_free_port(8899)
    cdp_port = find_free_port(9222)
    base_url = f"http://127.0.0.1:{proxy_port}"
    api_url = f"{base_url}/api/v1"

    # Ephemeral per-run fixture credentials — never hardcoded in source control
    customer_password = secrets.token_urlsafe(12) + "Aa1!"
    partner_password = secrets.token_urlsafe(12) + "Bb2!"
    empty_password = secrets.token_urlsafe(12) + "Cc3!"

    php_env = os.environ.copy()
    php_env.update(
        {
            "APP_ENV": "testing",
            "APP_DEBUG": "false",
            "APP_URL": base_url,
            "APP_CONFIG_CACHE": str(tmp_dir / "config.php"),
            "LARAVEL_STORAGE_PATH": str(storage_dir),
            "DB_CONNECTION": "sqlite",
            "DB_DATABASE": str(qa_db_path),
            "DB_URL": "",
            "CACHE_STORE": "database",
            "SESSION_DRIVER": "database",
            "QUEUE_CONNECTION": "sync",
            "MAIL_MAILER": "array",
            "TIJUM_PAYMENTS_LIVE_ENABLED": "false",
            "TIJUM_PARTNER_SETTLEMENTS_ENABLED": "false",
            "TIJUM_RAZORPAY_ROUTE_ENABLED": "false",
            "RAZORPAY_MODE": "test",
            "RAZORPAY_KEY_ID": "",
            "RAZORPAY_KEY_SECRET": "",
            "RAZORPAY_WEBHOOK_SECRET": "",
            "QA_CUSTOMER_PASSWORD": customer_password,
            "QA_PARTNER_PASSWORD": partner_password,
            "QA_EMPTY_PASSWORD": empty_password,
        }
    )

    backend_proc: subprocess.Popen | None = None
    chrome_proc: subprocess.Popen | None = None
    proxy_server: ThreadingHTTPServer | None = None

    try:
        print(f"[1/6] Seeding isolated SQLite QA database at {qa_db_path}...")
        seed_run = subprocess.run(
            ["php", str(SEEDER_SCRIPT)],
            cwd=str(REPO_ROOT),
            env=php_env,
            capture_output=True,
            text=True,
            check=False,
        )
        if seed_run.returncode != 0:
            print(seed_run.stdout)
            print(seed_run.stderr, file=sys.stderr)
            raise RuntimeError(
                f"Isolated QA seeder failed with exit code {seed_run.returncode}"
            )
        fixtures = json.loads(seed_run.stdout)
        print(
            f"      Seeded property='{fixtures['property_name']}', "
            f"hold='{fixtures['hold_booking_ref']}', "
            f"today='{fixtures['today_booking_ref']}', "
            f"settlement='{fixtures['settlement_settled_ref']}'"
        )

        print(f"[2/6] Starting isolated Laravel backend on 127.0.0.1:{backend_port}...")
        router_script = REPO_ROOT / "server.php"
        if not router_script.is_file():
            router_script = REPO_ROOT / "vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php"
        backend_proc = subprocess.Popen(
            ["php", "-S", f"127.0.0.1:{backend_port}", str(router_script)],
            cwd=str(PUBLIC_DIR),
            env=php_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        wait_for_backend(backend_port)
        print(f"      Laravel QA backend healthy at http://127.0.0.1:{backend_port}/api/v1")

        print(f"[3/6] Exporting Expo web bundle targeting {api_url}...")
        expo_env = os.environ.copy()
        expo_env["EXPO_PUBLIC_API_URL"] = api_url
        expo_env["EXPO_PUBLIC_ENVIRONMENT"] = "development"
        npx_cmd = "npx.cmd" if os.name == "nt" else "npx"
        export_run = subprocess.run(
            [
                npx_cmd,
                "expo",
                "export",
                "-p",
                "web",
                "--output-dir",
                str(dist_dir),
                "--clear",
            ],
            cwd=str(MOBILE_DIR),
            env=expo_env,
            capture_output=True,
            text=True,
            check=False,
        )
        if export_run.returncode != 0:
            print(export_run.stdout)
            print(export_run.stderr, file=sys.stderr)
            raise RuntimeError(
                f"Expo web export failed with exit code {export_run.returncode}"
            )
        verify_bundle_api_url(dist_dir, api_url)
        print(f"      Verified compiled bundle inlines EXPO_PUBLIC_API_URL={api_url}")

        print(f"[4/6] Starting local QA proxy + SPA server on {base_url}...")
        proxy_state = {"simulate_api_error": False}
        handler_cls = make_qa_proxy_handler(dist_dir, storage_public_dir, backend_port, proxy_state)
        proxy_server = ThreadingHTTPServer(("127.0.0.1", proxy_port), handler_cls)
        proxy_thread = threading.Thread(
            target=proxy_server.serve_forever, daemon=True
        )
        proxy_thread.start()

        print(f"[5/6] Launching headless Chrome CDP target on port {cdp_port}...")
        clean_stale_screenshots(SCREENSHOTS_DIR)
        chrome_proc = subprocess.Popen(
            [
                str(chrome_path),
                "--headless=new",
                f"--remote-debugging-port={cdp_port}",
                "--disable-gpu",
                "--no-sandbox",
                "--no-first-run",
                "--disable-extensions",
                "--window-size=390,844",
                f"--user-data-dir={chrome_profile}",
                "about:blank",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        config_payload = {
            "cdpPort": cdp_port,
            "baseUrl": base_url,
            "screenshotsDir": str(SCREENSHOTS_DIR),
            "fixtures": fixtures,
            "credentials": {
                "customerPassword": customer_password,
                "partnerPassword": partner_password,
                "emptyPassword": empty_password,
            },
        }
        config_file.write_text(json.dumps(config_payload, indent=2), encoding="utf-8")

        print("[6/6] Running web screen, web UI interaction, and API integration checks...")
        cdp_run = subprocess.run(
            ["node", str(CDP_SCRIPT), str(config_file)],
            cwd=str(REPO_ROOT),
            check=False,
        )
        return cdp_run.returncode
    finally:
        terminate_process(chrome_proc)
        terminate_process(backend_proc)
        if proxy_server:
            try:
                proxy_server.shutdown()
                proxy_server.server_close()
            except Exception:
                pass
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
