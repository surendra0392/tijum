import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Stage M3 Mobile UI Extensions & Parity Specification', () => {
    describe('Customer Review Submission Rules', () => {
        function validateReviewSubmission(payload: {
            overall_rating: number;
            cleanliness_rating?: number;
            food_quality_rating?: number;
            communication_rating?: number;
            value_rating?: number;
            title?: string;
            content?: string;
        }) {
            if (!payload.overall_rating || payload.overall_rating < 1 || payload.overall_rating > 5) {
                return { valid: false, error: 'Overall rating must be between 1 and 5' };
            }
            const subcategories = [
                payload.cleanliness_rating,
                payload.food_quality_rating,
                payload.communication_rating,
                payload.value_rating,
            ];
            for (const rating of subcategories) {
                if (rating !== undefined && (rating < 1 || rating > 5)) {
                    return { valid: false, error: 'Subcategory ratings must be between 1 and 5' };
                }
            }
            if (payload.content !== undefined && payload.content.trim().length > 0 && payload.content.trim().length < 10) {
                return { valid: false, error: 'Written feedback must be at least 10 characters' };
            }
            return { valid: true };
        }

        it('accepts valid review payload with all canonical subcategories', () => {
            const result = validateReviewSubmission({
                overall_rating: 5,
                cleanliness_rating: 4,
                food_quality_rating: 5,
                communication_rating: 5,
                value_rating: 4,
                title: 'Wonderful stay with home-cooked meals',
                content: 'The hostel was impeccably clean and the breakfast was hot and fresh.',
            });
            assert.strictEqual(result.valid, true);
        });

        it('rejects overall rating outside 1-5 boundary', () => {
            const zeroRating = validateReviewSubmission({ overall_rating: 0 });
            assert.strictEqual(zeroRating.valid, false);

            const sixRating = validateReviewSubmission({ overall_rating: 6 });
            assert.strictEqual(sixRating.valid, false);
        });

        it('enforces min 10 characters on non-empty review content', () => {
            const shortReview = validateReviewSubmission({
                overall_rating: 4,
                content: 'Good!',
            });
            assert.strictEqual(shortReview.valid, false);
            assert.match(shortReview.error!, /10 characters/);
        });

        it('determines stay review eligibility based on stay lifecycle status', () => {
            const isEligible = (status: string, isCompleted?: boolean) => {
                return status === 'completed' || status === 'checked_out' || Boolean(isCompleted);
            };

            assert.strictEqual(isEligible('completed'), true);
            assert.strictEqual(isEligible('checked_out'), true);
            assert.strictEqual(isEligible('confirmed', true), true);
            assert.strictEqual(isEligible('confirmed', false), false);
            assert.strictEqual(isEligible('awaiting_payment'), false);
        });
    });

    describe('Partner Physical Room Allocation Specification', () => {
        interface MockPhysicalRoom {
            id: number;
            property_id: number;
            property_room_type_id: number;
            room_number: string;
            floor?: string | number | null;
            is_active: boolean;
            is_occupied?: boolean;
        }

        function validateRoomAllocation(
            reservation: { status: string; property_room_type_id: number; physical_room_id?: number | null },
            targetRoom: MockPhysicalRoom,
        ) {
            if (!['confirmed', 'checked_in'].includes(reservation.status)) {
                return { valid: false, error: 'Only confirmed or checked-in reservations can be allocated' };
            }
            if (!targetRoom.is_active) {
                return { valid: false, error: 'Room is inactive' };
            }
            if (targetRoom.is_occupied && targetRoom.id !== reservation.physical_room_id) {
                return { valid: false, error: 'Room is currently occupied by another reservation' };
            }
            return { valid: true };
        }

        it('permits allocation of available active room to confirmed reservation', () => {
            const reservation = { status: 'confirmed', property_room_type_id: 10 };
            const room: MockPhysicalRoom = {
                id: 101,
                property_id: 1,
                property_room_type_id: 10,
                room_number: '201',
                floor: '2',
                is_active: true,
                is_occupied: false,
            };

            const result = validateRoomAllocation(reservation, room);
            assert.strictEqual(result.valid, true);
        });

        it('rejects allocation of occupied room to a different reservation', () => {
            const reservation = { status: 'confirmed', property_room_type_id: 10 };
            const occupiedRoom: MockPhysicalRoom = {
                id: 102,
                property_id: 1,
                property_room_type_id: 10,
                room_number: '202',
                floor: '2',
                is_active: true,
                is_occupied: true,
            };

            const result = validateRoomAllocation(reservation, occupiedRoom);
            assert.strictEqual(result.valid, false);
            assert.match(result.error!, /currently occupied/);
        });

        it('prevents room allocation for cancelled or awaiting payment bookings', () => {
            const pendingRes = { status: 'awaiting_payment', property_room_type_id: 10 };
            const room: MockPhysicalRoom = {
                id: 101,
                property_id: 1,
                property_room_type_id: 10,
                room_number: '201',
                is_active: true,
            };

            const result = validateRoomAllocation(pendingRes, room);
            assert.strictEqual(result.valid, false);
        });
    });

    describe('Forgot Password Flow Specification', () => {
        function validateForgotPasswordRequest(email: string, userType: 'customer' | 'owner') {
            if (!email || !email.trim()) {
                return { valid: false, error: 'Email is required' };
            }
            if (!email.includes('@') || !email.includes('.')) {
                return { valid: false, error: 'Invalid email address' };
            }
            const expectedEndpoint = `auth/${userType}/forgot-password`;
            return { valid: true, endpoint: expectedEndpoint };
        }

        it('validates customer password reset email and targets customer endpoint', () => {
            const res = validateForgotPasswordRequest('guest@traveler.com', 'customer');
            assert.strictEqual(res.valid, true);
            assert.strictEqual(res.endpoint, 'auth/customer/forgot-password');
        });

        it('validates partner password reset email and targets owner endpoint', () => {
            const res = validateForgotPasswordRequest('host@residence.com', 'owner');
            assert.strictEqual(res.valid, true);
            assert.strictEqual(res.endpoint, 'auth/owner/forgot-password');
        });

        it('rejects invalid email formats', () => {
            const res = validateForgotPasswordRequest('not-an-email', 'customer');
            assert.strictEqual(res.valid, false);
            assert.match(res.error!, /Invalid email/);
        });
    });

    describe('Brand & Truth-In-Advertising Copy Parity', () => {
        it('verifies customer login screen uses transparent meal disclosures copy', () => {
            const loginPath = path.resolve(__dirname, '../app/(auth)/customer-login.tsx');
            const fileContent = fs.readFileSync(loginPath, 'utf8');

            assert.match(
                fileContent,
                /transparent\s+meal disclosures/,
                'Must declare transparent meal disclosures',
            );
            assert.doesNotMatch(
                fileContent,
                /food-inclusive reservations/,
                'Legacy blanket food-inclusive claim must be removed',
            );
        });

        it('verifies owner login screen includes partner password recovery modal', () => {
            const ownerLoginPath = path.resolve(__dirname, '../app/(auth)/owner-login.tsx');
            const fileContent = fs.readFileSync(ownerLoginPath, 'utf8');

            assert.match(fileContent, /Forgot Password\?/);
            assert.match(fileContent, /PublicApi\.forgotPassword/);
            assert.match(fileContent, /'owner'/);
        });

        it('verifies customer booking screen includes review submission modal with 4 canonical subcategories', () => {
            const bookingPath = path.resolve(__dirname, '../app/(customer)/bookings/[reference].tsx');
            const fileContent = fs.readFileSync(bookingPath, 'utf8');

            assert.match(fileContent, /Rate & Review Your Stay/);
            assert.match(fileContent, /Cleanliness/);
            assert.match(fileContent, /Food & Dining/);
            assert.match(fileContent, /Host Communication/);
            assert.match(fileContent, /Value for Money/);
            assert.match(fileContent, /CustomerApi\.submitReview/);
        });

        it('verifies partner reservation screen includes physical room allocation workflow', () => {
            const partnerResPath = path.resolve(__dirname, '../app/(partner)/reservations/[reference].tsx');
            const fileContent = fs.readFileSync(partnerResPath, 'utf8');

            assert.match(fileContent, /Physical Room Allocation/);
            assert.match(fileContent, /OwnerApi\.getPropertyRooms/);
            assert.match(fileContent, /OwnerApi\.allocateRoom/);
            assert.match(fileContent, /Assign Physical Room/);
        });
    });
});
