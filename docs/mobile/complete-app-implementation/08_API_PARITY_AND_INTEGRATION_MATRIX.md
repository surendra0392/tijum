# TIJUM Mobile — API Parity & Integration Matrix
**Milestone:** Complete Mobile Application UI/UX Transformation & Implementation  
**Document ID:** `docs/mobile/complete-app-implementation/08_API_PARITY_AND_INTEGRATION_MATRIX.md`  
**Generated At:** 2026-11-20  
**Backend API Prefix:** `/api/v1`  
**Client Implementation:** `apps/mobile/src/api/*`

---

## 1. Public & Guest API Endpoints (`src/api/public.ts`)

| API Client Method | HTTP Method & Route | Backend Controller Action | Request Parameters | Response Type / Data Contract |
| :--- | :--- | :--- | :--- | :--- |
| `PublicApi.getProperties` | `GET /api/v1/properties` | `PublicPropertyController@index` | `city`, `category`, `locality`, `ac`, `gender`, `breakfast`, `lunch`, `dinner`, `sharing_capacity`, `min_price`, `max_price`, `check_in_date`, `check_out_date` | `PaginatedResponse<PropertyCard>` |
| `PublicApi.getProperty` | `GET /api/v1/properties/{slug}` | `PublicPropertyController@show` | `slug` (path) | `ApiResponse<PropertyDetail>` |
| `PublicApi.submitContact` | `POST /api/v1/contact-inquiries` | `ContactInquiryController@store` | `name`, `email`, `mobile`, `subject`, `message` | `ApiResponse<{ id: number; reference: string }>` |
| `PublicApi.forgotPassword` | `POST /api/v1/auth/forgot-password` | `PasswordResetController@sendResetLink` | `email`, `principal_type` | `ApiResponse<{ message: string }>` |

---

## 2. Customer API Endpoints (`src/api/customer.ts`)

| API Client Method | HTTP Method & Route | Backend Controller Action | Request Parameters | Response Type / Data Contract |
| :--- | :--- | :--- | :--- | :--- |
| `CustomerApi.getProfile` | `GET /api/v1/customer/profile` | `CustomerProfileController@show` | *None* | `ApiResponse<CustomerProfile>` |
| `CustomerApi.updateProfile` | `PUT /api/v1/customer/profile` | `CustomerProfileController@update` | `name`, `phone`, `marketing_consent` | `ApiResponse<CustomerProfile>` |
| `CustomerApi.changePassword` | `POST /api/v1/customer/change-password` | `CustomerProfileController@changePassword` | `current_password`, `password`, `password_confirmation` | `ApiResponse<{ message: string }>` |
| `CustomerApi.getReservations` | `GET /api/v1/customer/reservations` | `CustomerReservationController@index` | `status` (optional filter) | `ApiResponse<Reservation[]>` |
| `CustomerApi.getReservation` | `GET /api/v1/customer/reservations/{ref}` | `CustomerReservationController@show` | `reference` (path) | `ApiResponse<Reservation>` |
| `CustomerApi.createReservation` | `POST /api/v1/customer/reservations` | `CustomerReservationController@store` | `property_id`, `property_room_type_id`, `check_in_date`, `duration_type`, `duration_quantity`, `quantity`, `guest_gender`, `coupon_code`, `points_to_redeem` | `ApiResponse<Reservation>` |
| `CustomerApi.cancelReservation` | `POST /api/v1/customer/reservations/{ref}/cancel` | `CustomerReservationController@cancel` | `reference` (path), `reason` | `ApiResponse<Reservation>` |
| `CustomerApi.getWishlist` | `GET /api/v1/customer/wishlist` | `CustomerWishlistController@index` | *None* | `ApiResponse<PropertyCard[]>` |
| `CustomerApi.addToWishlist` | `POST /api/v1/customer/wishlist/{id}` | `CustomerWishlistController@store` | `id` (path) | `ApiResponse<{ added: boolean }>` |
| `CustomerApi.removeFromWishlist` | `DELETE /api/v1/customer/wishlist/{id}` | `CustomerWishlistController@destroy` | `id` (path) | `ApiResponse<{ removed: boolean }>` |
| `CustomerApi.toggleWishlist` | `POST /api/v1/customer/wishlist/{id}/toggle` | `CustomerWishlistController@toggle` | `id` (path), `active` (boolean) | `ApiResponse<{ wishlisted: boolean }>` |
| `CustomerApi.submitReview` | `POST /api/v1/customer/reservations/{ref}/review` | `CustomerReviewController@store` | `overall_rating`, `cleanliness_rating`, `food_rating`, `communication_rating`, `value_rating`, `title`, `content` | `ApiResponse<Review>` |
| `CustomerApi.getCases` | `GET /api/v1/customer/cases` | `CustomerProtectionCaseController@index` | *None* | `ApiResponse<CustomerProtectionCase[]>` |
| `CustomerApi.getCase` | `GET /api/v1/customer/cases/{ref}` | `CustomerProtectionCaseController@show` | `reference` (path) | `ApiResponse<CustomerProtectionCase>` |
| `CustomerApi.createCase` | `POST /api/v1/customer/cases` | `CustomerProtectionCaseController@store` | `booking_reference`, `category`, `description` | `ApiResponse<CustomerProtectionCase>` |
| `CustomerApi.getNotifications` | `GET /api/v1/customer/notifications` | `NotificationController@index` | *None* | `ApiResponse<NotificationItem[]>` |
| `CustomerApi.markRead` | `PATCH /api/v1/customer/notifications/{id}/read` | `NotificationController@markRead` | `id` (path) | `ApiResponse<{ read: boolean }>` |
| `CustomerApi.markAllRead` | `POST /api/v1/customer/notifications/mark-all-read` | `NotificationController@markAllRead` | *None* | `ApiResponse<{ success: boolean }>` |
| `CustomerApi.getNotificationPreferences`| `GET /api/v1/customer/notification-preferences` | `NotificationPreferenceController@show` | *None* | `ApiResponse<NotificationPreferences>` |
| `CustomerApi.updateNotificationPreferences`| `PUT /api/v1/customer/notification-preferences` | `NotificationPreferenceController@update` | `in_app_operational`, `email_operational`, `push_operational`, `sms_operational`, `whatsapp_opted_in` | `ApiResponse<NotificationPreferences>` |

---

## 3. Partner / Owner API Endpoints (`src/api/owner.ts`)

| API Client Method | HTTP Method & Route | Backend Controller Action | Request Parameters | Response Type / Data Contract |
| :--- | :--- | :--- | :--- | :--- |
| `OwnerApi.getDashboard` | `GET /api/v1/owner/dashboard` | `OwnerDashboardController@index` | *None* | `ApiResponse<PartnerDashboardData>` |
| `OwnerApi.getProfile` | `GET /api/v1/owner/profile` | `OwnerProfileController@show` | *None* | `ApiResponse<OwnerProfile>` |
| `OwnerApi.updateProfile` | `PUT /api/v1/owner/profile` | `OwnerProfileController@update` | `name`, `phone` | `ApiResponse<OwnerProfile>` |
| `OwnerApi.changePassword` | `POST /api/v1/owner/change-password` | `OwnerProfileController@changePassword` | `current_password`, `password`, `password_confirmation` | `ApiResponse<{ message: string }>` |
| `OwnerApi.getProperties` | `GET /api/v1/owner/properties` | `OwnerPropertyController@index` | *None* | `ApiResponse<OwnerProperty[]>` |
| `OwnerApi.getProperty` | `GET /api/v1/owner/properties/{id}` | `OwnerPropertyController@show` | `id` (path) | `ApiResponse<OwnerProperty>` |
| `OwnerApi.getPropertyRooms` | `GET /api/v1/owner/properties/{id}/rooms` | `OwnerPhysicalRoomController@index` | `id` (path) | `ApiResponse<PhysicalRoom[]>` |
| `OwnerApi.createRoom` | `POST /api/v1/owner/properties/{id}/rooms` | `OwnerPhysicalRoomController@store` | `room_number`, `property_room_type_id`, `floor_number`, `wing_name` | `ApiResponse<PhysicalRoom>` |
| `OwnerApi.updateRoom` | `PUT /api/v1/owner/properties/{id}/rooms/{roomId}` | `OwnerPhysicalRoomController@update` | `room_number`, `property_room_type_id`, `floor_number`, `wing_name` | `ApiResponse<PhysicalRoom>` |
| `OwnerApi.updateRoomStatus` | `PATCH /api/v1/owner/properties/{id}/rooms/{roomId}/status`| `OwnerPhysicalRoomController@updateStatus` | `status` (active/maintenance), `reason` | `ApiResponse<PhysicalRoom>` |
| `OwnerApi.getReservations` | `GET /api/v1/owner/reservations` | `OwnerReservationController@index` | `status` (optional filter) | `ApiResponse<Reservation[]>` |
| `OwnerApi.getReservation` | `GET /api/v1/owner/reservations/{ref}` | `OwnerReservationController@show` | `reference` (path) | `ApiResponse<Reservation>` |
| `OwnerApi.allocateRoom` | `POST /api/v1/owner/reservations/{ref}/allocate-room` | `OwnerReservationController@allocateRoom` | `reference` (path), `physical_room_id` | `ApiResponse<Reservation>` |
| `OwnerApi.checkInReservation` | `POST /api/v1/owner/reservations/{ref}/check-in` | `OwnerReservationController@checkIn` | `reference` (path), `notes` | `ApiResponse<Reservation>` |
| `OwnerApi.checkOutReservation`| `POST /api/v1/owner/reservations/{ref}/check-out` | `OwnerReservationController@checkOut` | `reference` (path), `turnover_notes` | `ApiResponse<Reservation>` |
| `OwnerApi.getFinancialProfile`| `GET /api/v1/owner/financial-profile` | `OwnerFinancialProfileController@show` | *None* | `ApiResponse<OwnerFinancialProfile>` |
| `OwnerApi.getCommissionAgreements`| `GET /api/v1/owner/commission-agreements` | `OwnerCommissionAgreementController@index`| *None* | `ApiResponse<OwnerCommissionAgreement[]>` |
| `OwnerApi.acceptCommissionAgreement`| `POST /api/v1/owner/commission-agreements/{id}/accept`| `OwnerCommissionAgreementController@accept`| `id` (path) | `ApiResponse<OwnerCommissionAgreement>` |
| `OwnerApi.getSettlements` | `GET /api/v1/owner/settlements` | `OwnerSettlementController@index` | *None* | `ApiResponse<Settlement[]>` |
| `OwnerApi.getSettlement` | `GET /api/v1/owner/settlements/{ref}` | `OwnerSettlementController@show` | `reference` (path) | `ApiResponse<Settlement>` |
| `OwnerApi.getReviews` | `GET /api/v1/owner/reviews` | `OwnerReviewController@index` | *None* | `ApiResponse<OwnerReview[]>` |
| `OwnerApi.replyToReview` | `POST /api/v1/owner/reviews/{id}/reply` | `OwnerReviewController@reply` | `id` (path), `response_text` (max 2500) | `ApiResponse<ReviewResponse>` |
| `OwnerApi.getCases` | `GET /api/v1/owner/cases` | `OwnerCaseController@index` | *None* | `ApiResponse<Case[]>` |
| `OwnerApi.getCase` | `GET /api/v1/owner/cases/{ref}` | `OwnerCaseController@show` | `reference` (path) | `ApiResponse<Case>` |

---

## 4. Rewards, Loyalty & Promotion API Endpoints (`src/api/rewards.ts`)

| API Client Method | HTTP Method & Route | Backend Controller Action | Request Parameters | Response Type / Data Contract |
| :--- | :--- | :--- | :--- | :--- |
| `RewardsApi.getRewardsOverview`| `GET /api/v1/rewards/overview` | `CustomerRewardsController@overview` | *None* | `ApiResponse<RewardsOverview>` |
| `RewardsApi.getPointsWallet` | `GET /api/v1/rewards/points` | `CustomerRewardsController@points` | *None* | `ApiResponse<{ wallet: PointsWallet }>` |
| `RewardsApi.getReferralProgram`| `GET /api/v1/rewards/referrals` | `CustomerRewardsController@referrals` | *None* | `ApiResponse<ReferralProgram>` |
| `RewardsApi.getAvailableCoupons`| `GET /api/v1/rewards/coupons` | `CustomerRewardsController@coupons` | *None* | `ApiResponse<Coupon[]>` |
| `RewardsApi.validateCoupon` | `POST /api/v1/rewards/coupons/validate` | `CustomerRewardsController@validateCoupon` | `coupon_code`, `subtotal_paise`, `property_id` | `ApiResponse<{ valid: boolean; discount_amount_paise: number; coupon: Coupon }>` |
