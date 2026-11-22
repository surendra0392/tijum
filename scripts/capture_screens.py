import os
import sys
import time
import subprocess
import threading
import tempfile
from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = REPO_ROOT / "apps" / "mobile" / "dist-web"
SCREENSHOTS_DIR = REPO_ROOT / "docs" / "mobile" / "screenshots"
CHROME_PATH = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")

SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        # If path points to an actual file on disk, serve it
        req_path = self.path.split('?')[0].split('#')[0]
        local_file = DIST_DIR / req_path.lstrip('/')
        if local_file.is_file():
            return super().do_GET()
        # Otherwise fallback to index.html for SPA routing
        self.path = "/index.html"
        return super().do_GET()

def start_server(port=8899):
    server = HTTPServer(("127.0.0.1", port), SpaHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return server

def capture_screen(url, output_path, temp_profile_dir):
    cmd = [
        str(CHROME_PATH),
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-first-run",
        f"--user-data-dir={temp_profile_dir}",
        "--window-size=390,844",
        "--hide-scrollbars",
        "--virtual-time-budget=3500",
        f"--screenshot={output_path}",
        url
    ]
    try:
        subprocess.run(cmd, capture_output=True, timeout=15)
    except Exception as e:
        print(f"Failed to capture {url}: {e}")

def main():
    port = 8899
    server = start_server(port)
    print(f"SPA Server running on http://127.0.0.1:{port}")
    time.sleep(1)

    temp_profile = tempfile.mkdtemp(prefix="tijum_chrome_")

    routes = [
        ("01-onboarding.png", f"http://127.0.0.1:{port}/"),
        ("02-customer-login.png", f"http://127.0.0.1:{port}/(auth)/customer-login"),
        ("03-customer-register.png", f"http://127.0.0.1:{port}/(auth)/customer-register"),
        ("04-owner-login.png", f"http://127.0.0.1:{port}/(auth)/owner-login"),
        ("05-owner-register.png", f"http://127.0.0.1:{port}/(auth)/owner-register"),
        ("06-explore-stays.png", f"http://127.0.0.1:{port}/(customer)/explore"),
        ("07-customer-bookings.png", f"http://127.0.0.1:{port}/(customer)/bookings"),
        ("08-customer-support.png", f"http://127.0.0.1:{port}/(customer)/support"),
        ("09-customer-profile.png", f"http://127.0.0.1:{port}/(customer)/profile"),
        ("10-rewards-referrals.png", f"http://127.0.0.1:{port}/(customer)/rewards/referrals"),
        ("11-partner-dashboard.png", f"http://127.0.0.1:{port}/(partner)/dashboard"),
        ("12-partner-properties.png", f"http://127.0.0.1:{port}/(partner)/properties"),
        ("13-partner-reservations.png", f"http://127.0.0.1:{port}/(partner)/reservations"),
        ("14-partner-settlements.png", f"http://127.0.0.1:{port}/(partner)/settlements"),
        ("15-help-faq.png", f"http://127.0.0.1:{port}/help"),
        ("16-legal-terms.png", f"http://127.0.0.1:{port}/legal/terms"),
    ]

    for filename, url in routes:
        out_file = SCREENSHOTS_DIR / filename
        print(f"Capturing {filename} from {url}...")
        capture_screen(url, str(out_file), temp_profile)
        if out_file.exists() and out_file.stat().st_size > 0:
            print(f"  -> Generated {filename} ({out_file.stat().st_size} bytes)")
        else:
            print(f"  -> Warning: {filename} was not generated or is empty")

    server.shutdown()
    print("Screen capture completed!")

if __name__ == "__main__":
    main()
