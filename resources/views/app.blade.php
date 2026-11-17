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
                @if (isset($seo['structuredData']))
                    <script data-inertia="structured-data" type="application/ld+json">{!! json_encode($seo['structuredData'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
                @endif
            @endif
        </x-inertia::head>
    </head>
    <body class="bg-background font-sans text-foreground antialiased">
        <x-inertia::app />
    </body>
</html>
