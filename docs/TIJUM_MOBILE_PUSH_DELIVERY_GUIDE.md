# TIJUM Mobile Push Notification Delivery & Reliability Guide

**Phase:** Phase 20A — Mobile Stabilization, Framework Upgrade, Security Hardening & Production Readiness  
**Target Systems:** TIJUM Mobile Application (`PushNotificationService.ts`) and Backend Notification Pipeline (`PushNotificationChannel.php`)  
**Gateway Provider:** Expo Push Service (`https://exp.host/--/api/v2/push/send`)  
**Device Storage Table:** `mobile_devices`

---

## 1. Executive Summary & Philosophy

Push notifications in TIJUM are mission-critical operational communications. Guests require real-time alerts when a host confirms a booking, when a 15-minute payment window opens, or when food serving times commence. Similarly, accommodation partners require instantaneous alerts when a new reservation request arrives so they can confirm availability and lock room capacity.

Phase 20A resolves critical reliability and user-experience issues identified in mobile push notification lifecycles:
1. **Contextual Permission Requests**: Eliminating cold-start permission popups in favor of high-intent user moments.
2. **Principal-Bound Device Registration**: Strictly tying device push tokens to the authenticated user ID and account type.
3. **Ticket Receipt & Deactivation Protocol**: Processing Expo Push ticket responses and automatically deactivating stale or uninstalled device tokens (`DeviceNotRegistered`).
4. **Deep-Link Validation & Authentication Guard**: Preventing unauthorized navigation to cross-domain screens from push notifications.

---

## 2. Contextual Permission Request Flow

### 2.1 The Problem with Cold-Start Prompts
Prompting users for push permissions immediately upon opening the app produces high denial rates (exceeding 60% on iOS). Once denied at the OS level, the permission can only be re-enabled by navigating manually to system settings, effectively disabling critical reservation updates for that customer.

### 2.2 TIJUM Contextual Strategy
Push notifications are never requested during app boot or exploratory browsing. Instead, `PushNotificationService.requestPushPermissionsContextually` requests permissions during high-intent user moments:

```
[ User Action: Books Stay or Updates Notification Settings ]
                              │
                              ▼
           ┌──────────────────────────────────────┐
           │ Check Current OS Permission Status   │
           └──────────────────┬───────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       [ Already Granted ]             [ Undetermined / Denied ]
       Register Token with Backend            │
                                              ▼
                               ┌─────────────────────────────┐
                               │ Check Dismissal History     │
                               │ (Max 2 soft prompts)        │
                               └──────────────┬──────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                               ▼
                      [ Below Limit ]                 [ Repeatedly Denied ]
                      Prompt OS Dialog                Do Not Nag (Silent Fallback)
```

### Context Types:
- `booking_placed`: Triggered immediately after the customer creates a reservation so they can track owner acceptance.
- `settings_toggle`: Triggered when the user explicitly enables push notifications in their profile.
- `owner_onboarding`: Triggered when an accommodation partner lists a property, ensuring they receive incoming booking requests.
- `in_app_prompt`: Soft in-app banner explaining value before triggering OS prompt.

---

## 3. Device Registration & Unregistration Protocol

Device tokens are stored in the `mobile_devices` table, which implements polymorphic relationships to support both `User` (Customer) and `Owner` (Partner) models.

### 3.1 Registration Payload
```json
POST /api/v1/customer/devices/register
{
  "device_installation_id": "inst_9f8a7b6c5d4e",
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "app_version": "1.0.0",
  "device_name": "iPhone 15 Pro"
}
```

Backend processing:
1. Validates that the push token matches valid Expo push token format (`ExponentPushToken[...]` or standard hex).
2. Uses `updateOrCreate` on `device_installation_id` scoped to `notifiable_type` and `notifiable_id`.
3. Activates the device (`is_active = true`), updates `last_used_at`, and records the client app version.

### 3.2 Unregistration on Logout
When the user logs out or switches roles, the mobile client calls:
```json
DELETE /api/v1/customer/devices/unregister
{
  "device_installation_id": "inst_9f8a7b6c5d4e"
}
```
The backend marks `is_active = false`, clearing push delivery targets for that device to prevent the next user of a shared device from receiving private reservation alerts.

---

## 4. Expo Push Ticket Processing & Automatic Deactivation

The backend push channel (`PushNotificationChannel.php`) communicates with the Expo Push API with comprehensive ticket inspection:

### 4.1 Dispatch Flow
1. **Device Query**: Fetches all `active()` devices for the notifiable with non-null `push_token`.
2. **Suppression Check**: If no active devices exist, the delivery is marked `Suppressed` with error code `NO_ACTIVE_MOBILE_DEVICES`. No wasted external API calls are made.
3. **HTTP Dispatch**: Sends bulk push messages with `5s` timeout.

### 4.2 Handling `DeviceNotRegistered`
When an app is uninstalled or a user disables notifications in iOS/Android settings, Expo returns an error ticket:

```json
{
  "status": "error",
  "message": "\"ExponentPushToken[...]\" is not a registered push token.",
  "details": {
    "error": "DeviceNotRegistered"
  }
}
```

Upon receiving `DeviceNotRegistered`:
- The channel identifies the specific device in `deviceMap`.
- Invokes `$device->revoke()`, setting `is_active = false` and recording `revoked_at = now()`.
- If all devices targeted for that delivery are unregistered, the delivery status is updated to `Failed` (`DEVICE_NOT_REGISTERED`).
- Prevents subsequent notifications from repeatedly attempting delivery to dead endpoints.

---

## 5. Deep-Link Navigation Security

Push notifications include structured metadata for in-app navigation:

```json
{
  "delivery_id": 142,
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "action_url": "/customer/bookings/TJR-2026-104928"
}
```

When tapped, `PushNotificationService.validateDeepLink()` enforces security rules before handing control to the router:
1. **Scheme Stripping**: Converts `tijum://...` to relative application path.
2. **Protocol Check**: Strictly rejects `javascript:`, `data:`, or external URLs.
3. **Session Verification**:
   - `/customer/*` requires active `customer` session. If partner is signed in, user is directed to `/login` with an authentication notice.
   - `/partner/*` requires active `owner` session. If customer is signed in, user is directed to `/login`.
4. **Public Route Fallback**: Public routes (`/search`, `/property/:slug`) navigate freely regardless of session state.
