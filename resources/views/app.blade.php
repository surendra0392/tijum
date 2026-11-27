@php
    $cookieAppearance = request()->cookie('appearance') ?? 'light';
    $isDarkInitial = $cookieAppearance === 'dark';
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="{{ $isDarkInitial ? 'dark' : '' }}" style="{{ $isDarkInitial ? 'color-scheme: dark;' : '' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="theme-color" content="{{ $isDarkInitial ? '#1E131D' : '#442F41' }}">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="TIJUM">
        <link rel="manifest" href="/manifest.webmanifest">

        <script>
            (function() {
                try {
                    var local = localStorage.getItem('appearance');
                    var cookieMatch = document.cookie.match(/(?:^|; )appearance=([^;]*)/);
                    var cookieVal = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
                    var appearance = local || cookieVal || 'light';
                    var isDark = appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    var root = document.documentElement;
                    if (isDark) {
                        root.classList.add('dark');
                        root.style.colorScheme = 'dark';
                    } else {
                        root.classList.remove('dark');
                        root.style.colorScheme = 'light';
                    }
                    var meta = document.querySelector('meta[name="theme-color"]');
                    if (meta) {
                        meta.setAttribute('content', isDark ? '#1E131D' : '#442F41');
                    }
                } catch (e) {}
            })();
        </script>

        <link rel="icon" href="/favicon.ico" sizes="48x48">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon-dark.png" media="(prefers-color-scheme: light)">
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon-light.png" media="(prefers-color-scheme: dark)">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

        {{-- iOS Safari Standalone PWA Launch Splash Screens --}}
        <link rel="apple-touch-startup-image" href="/pwa/splash/apple-splash-1290-2796.png" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
        <link rel="apple-touch-startup-image" href="/pwa/splash/apple-splash-1179-2556.png" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
        <link rel="apple-touch-startup-image" href="/pwa/splash/apple-splash-1170-2532.png" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
        <link rel="apple-touch-startup-image" href="/pwa/splash/apple-splash-1284-2778.png" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
        <link rel="apple-touch-startup-image" href="/pwa/splash/apple-splash-1125-2436.png" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">
        <link rel="apple-touch-startup-image" href="/pwa/splash/apple-splash-750-1334.png" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)">
        <link rel="apple-touch-startup-image" href="/pwa/splash/apple-splash-1668-2388.png" media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)">
        <link rel="apple-touch-startup-image" href="/pwa/splash/apple-splash-2048-2732.png" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)">

        <style>
            #tijum-pwa-splash {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 99999;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background-color: #FFF4EE;
                color: #442F41;
                opacity: 1;
                transition: opacity 280ms ease-out, visibility 280ms ease-out;
                pointer-events: all;
            }
            html.dark #tijum-pwa-splash {
                background-color: #1E131D;
                color: #FFF4EE;
            }
            html.tijum-pwa-launching,
            html.tijum-pwa-launching body {
                overflow: hidden;
            }
            html.tijum-pwa-launching #tijum-pwa-splash {
                display: flex;
            }
            #tijum-pwa-splash.is-hidden {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }
            #tijum-pwa-splash .tijum-splash-icon {
                width: 88px;
                height: 88px;
                border-radius: 22px;
                overflow: hidden;
                box-shadow: 0 20px 44px -18px rgba(68, 47, 65, 0.45);
                animation: tijumSplashPop 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
            }
            #tijum-pwa-splash .tijum-splash-wordmark {
                margin-top: 18px;
                font-family: 'Montserrat', ui-sans-serif, system-ui, -apple-system, sans-serif;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: 0.08em;
                line-height: 1.1;
            }
            #tijum-pwa-splash .tijum-splash-tagline {
                margin-top: 6px;
                font-family: 'Nunito', ui-sans-serif, system-ui, -apple-system, sans-serif;
                font-size: 13px;
                font-weight: 600;
                color: #8B6B82;
            }
            html.dark #tijum-pwa-splash .tijum-splash-tagline {
                color: #F4C4BA;
            }
            #tijum-pwa-splash .tijum-splash-bar {
                margin-top: 26px;
                width: 112px;
                height: 3px;
                border-radius: 999px;
                background: rgba(68, 47, 65, 0.14);
                overflow: hidden;
            }
            html.dark #tijum-pwa-splash .tijum-splash-bar {
                background: rgba(255, 244, 238, 0.18);
            }
            #tijum-pwa-splash .tijum-splash-bar::after {
                content: '';
                display: block;
                width: 44%;
                height: 100%;
                border-radius: 999px;
                background: #FF7A67;
                animation: tijumSplashSlide 1s ease-in-out infinite;
            }
            @keyframes tijumSplashPop {
                0% { opacity: 0; transform: scale(0.9); }
                100% { opacity: 1; transform: scale(1); }
            }
            @keyframes tijumSplashSlide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(260%); }
            }
            @media (prefers-reduced-motion: reduce) {
                #tijum-pwa-splash .tijum-splash-icon,
                #tijum-pwa-splash .tijum-splash-bar::after {
                    animation: none;
                }
            }
        </style>
        <script>
            (function() {
                try {
                    var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
                    var alreadyShown = sessionStorage.getItem('tijum_pwa_splash_seen') === '1';
                    if (isStandalone && !alreadyShown) {
                        document.documentElement.classList.add('tijum-pwa-launching');
                        sessionStorage.setItem('tijum_pwa_splash_seen', '1');
                        window.__tijumSplashStartedAt = Date.now();
                    }
                } catch (e) {}
            })();
        </script>

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @php($seo = $page['props']['seo'] ?? null)
        <x-inertia::head>
            <title data-inertia="">{{ is_array($seo) && isset($seo['title']) ? $seo['title'] : 'TIJUM — Stay easy. Eat well. Spend less.' }}</title>
            @if (is_array($seo))
                <meta data-inertia="meta-description" name="description" content="{{ $seo['description'] }}">
                <link data-inertia="canonical" rel="canonical" href="{{ $seo['canonical'] }}">
                <meta data-inertia="robots" name="robots" content="{{ $seo['robots'] ?? 'index, follow' }}">
                <meta data-inertia="og-site-name" property="og:site_name" content="{{ $seo['ogSiteName'] ?? 'TIJUM' }}">
                <meta data-inertia="og-title" property="og:title" content="{{ $seo['title'] }}">
                <meta data-inertia="og-description" property="og:description" content="{{ $seo['description'] }}">
                <meta data-inertia="og-type" property="og:type" content="{{ $seo['ogType'] }}">
                <meta data-inertia="og-url" property="og:url" content="{{ $seo['canonical'] }}">
                <meta data-inertia="og-image" property="og:image" content="{{ $seo['ogImage'] }}">
                <meta data-inertia="twitter-card" name="twitter:card" content="summary_large_image">
                <meta data-inertia="twitter-title" name="twitter:title" content="{{ $seo['title'] }}">
                <meta data-inertia="twitter-description" name="twitter:description" content="{{ $seo['description'] }}">
                <meta data-inertia="twitter-image" name="twitter:image" content="{{ $seo['ogImage'] }}">
                @if (! empty($seo['googleSiteVerification']))
                    <meta data-inertia="google-site-verification" name="google-site-verification" content="{{ $seo['googleSiteVerification'] }}">
                @endif
                @if (! empty($seo['bingSiteVerification']))
                    <meta data-inertia="bing-site-verification" name="msvalidate.01" content="{{ $seo['bingSiteVerification'] }}">
                @endif
                @if (isset($seo['structuredData']))
                    <script data-inertia="structured-data" type="application/ld+json">{!! json_encode($seo['structuredData'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
                @endif
            @endif
        </x-inertia::head>
    </head>
    <body class="bg-background font-sans text-foreground antialiased">
        <div id="tijum-pwa-splash" role="status" aria-label="Loading TIJUM">
            <div class="tijum-splash-icon">
                <img src="/pwa/icon-192x192.png" alt="TIJUM" width="88" height="88" style="display:block;width:100%;height:100%;object-fit:cover;">
            </div>
            <div class="tijum-splash-wordmark">TIJUM</div>
            <div class="tijum-splash-tagline">Stay easy. Eat well. Spend less.</div>
            <div class="tijum-splash-bar" aria-hidden="true"></div>
        </div>
        <script>
            (function() {
                if (!document.documentElement.classList.contains('tijum-pwa-launching')) {
                    return;
                }
                var dismissed = false;
                function hideSplash() {
                    if (dismissed) return;
                    dismissed = true;
                    var el = document.getElementById('tijum-pwa-splash');
                    var elapsed = Date.now() - (window.__tijumSplashStartedAt || Date.now());
                    var remaining = Math.max(0, 420 - elapsed);
                    window.setTimeout(function() {
                        if (el) {
                            el.classList.add('is-hidden');
                            window.setTimeout(function() {
                                if (el && el.parentNode) el.parentNode.removeChild(el);
                                document.documentElement.classList.remove('tijum-pwa-launching');
                            }, 300);
                        } else {
                            document.documentElement.classList.remove('tijum-pwa-launching');
                        }
                    }, remaining);
                }
                window.addEventListener('tijum:app-ready', hideSplash, { once: true });
                window.addEventListener('load', hideSplash, { once: true });
                window.setTimeout(hideSplash, 1800);
            })();
        </script>
        <x-inertia::app />
    </body>
</html>
