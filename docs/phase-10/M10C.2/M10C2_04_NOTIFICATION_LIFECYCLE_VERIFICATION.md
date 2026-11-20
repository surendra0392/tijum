# TIJUM Phase M10C.2 — Notification Lifecycle Verification Report

## 1. Context & User Experience Requirements

Mobile notifications in TIJUM serve critical real-time marketplace events:
- Instant booking confirmations and payment reminders (15-minute hold expiration warnings).
- Host check-in clearances, front-desk arrival notices, and customer protection case messages.
- Security alerts (password changes, active session terminations).

To avoid user disruption while ensuring high opt-in rates and immediate permission awareness:
1. **Initial Install Prompt:** The application initiates native OS permission requests on first install / first launch so that users are immediately aware of push notifications and can grant them upfront.
2. **Contextual High-Intent Moments:** If initially declined, the app prompts again during high-intent actions (e.g., booking confirmed, settings toggle).
3. **Android 13+ Compliance:** Explicit declaration of `android.permission.POST_NOTIFICATIONS` in `apps/mobile/app.json`.

---

## 2. Implementation in Mobile Application

### 2.1 First-Launch Permission Prompt
In `apps/mobile/src/notifications/PushNotificationService.ts`:
```typescript
/**
 * Request permissions on initial app install / first launch.
 * Triggers native OS notification permission dialog on Android 13+ and iOS.
 */
static async requestInitialPermissionsOnInstall(): Promise<boolean> {
    try {
        const currentStatus = await this.checkPermissionStatus();
        if (currentStatus === Notifications.PermissionStatus.GRANTED) {
            return true;
        }

        const { status } = await Notifications.requestPermissionsAsync({
            ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
            },
        });

        return status === Notifications.PermissionStatus.GRANTED;
    } catch {
        return false;
    }
}
```

This method is mounted directly in `apps/mobile/app/_layout.tsx` during initial application initialization:
```typescript
useEffect(() => {
    // Request initial notification permissions on install / cold launch
    PushNotificationService.requestInitialPermissionsOnInstall().catch(() => {});
}, []);
```

### 2.2 Native Android Manifest Permissions (`app.json`)
Declared under `expo.android.permissions`:
```json
"permissions": [
    "android.permission.CAMERA",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.RECEIVE_BOOT_COMPLETED"
]
```

### 2.3 Backend Device Registration & Preference Synchronization
When push permission is granted:
- `PushNotificationService.registerForPushNotifications(accountType)` retrieves the Expo push token.
- Device installation UUID is obtained from secure encrypted storage (`SecureTokenStorage.getInstallationId()`).
- Tokens are registered via:
  - Customer: `POST /api/v1/customer/devices/register`
  - Partner: `POST /api/v1/owner/devices/register`
- Tokens are SHA-256 hashed and stored idempotently in `mobile_devices` table.
- When users toggle push notifications in settings, the mobile app synchronizes both the device registration and backend notification preferences (`PUT /api/v1/customer/notifications/preferences`).
- Upon logout or session revocation, `DELETE /api/v1/{role}/devices/unregister` is called, ensuring notifications are never delivered to orphaned devices.
