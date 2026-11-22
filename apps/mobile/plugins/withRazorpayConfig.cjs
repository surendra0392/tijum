const { withInfoPlist, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const UPI_QUERY_SCHEMES = ['tez', 'phonepe', 'paytmmp', 'bhim', 'upi', 'credpay'];

const RAZORPAY_PROGUARD_RULES = `
# TIJUM Razorpay Checkout SDK Proguard / R8 Rules
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
    public void onPayment*(...);
}
`;

function withRazorpayIosSchemes(config) {
    return withInfoPlist(config, (modConfig) => {
        const existing = Array.isArray(
            modConfig.modResults.LSApplicationQueriesSchemes,
        )
            ? modConfig.modResults.LSApplicationQueriesSchemes
            : [];
        const merged = Array.from(new Set([...existing, ...UPI_QUERY_SCHEMES]));
        modConfig.modResults.LSApplicationQueriesSchemes = merged;
        return modConfig;
    });
}

function withRazorpayAndroidProguard(config) {
    return withDangerousMod(config, [
        'android',
        async (modConfig) => {
            const proguardPath = path.join(
                modConfig.modRequest.platformProjectRoot,
                'app',
                'proguard-rules.pro',
            );
            if (fs.existsSync(proguardPath)) {
                const current = fs.readFileSync(proguardPath, 'utf8');
                if (!current.includes('com.razorpay.**')) {
                    fs.writeFileSync(
                        proguardPath,
                        `${current}\n${RAZORPAY_PROGUARD_RULES.trim()}\n`,
                        'utf8',
                    );
                }
            }
            return modConfig;
        },
    ]);
}

module.exports = function withRazorpayConfig(config) {
    config = withRazorpayIosSchemes(config);
    config = withRazorpayAndroidProguard(config);
    return config;
};
