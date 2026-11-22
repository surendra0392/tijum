import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    CANONICAL_CATEGORIES,
    isValidCanonicalCategory,
} from '../src/constants/categories.ts';
import {
    buildLoginPayload,
    withPasswordConfirmation,
} from '../src/auth/payloads.ts';

describe('Mobile Auth, Search Gender Filter & Wishlist Features', () => {
    describe('Customer Auth Specifications', () => {
        it('requires phone and terms acceptance during registration', () => {
            const validateRegistration = (payload: {
                name: string;
                email: string;
                phone?: string;
                password: string;
                terms_accepted?: boolean;
            }) => {
                const errors: string[] = [];
                if (!payload.name?.trim()) errors.push('Name is required');
                if (!payload.email?.trim()) errors.push('Email is required');
                if (!payload.phone?.trim()) errors.push('Phone is mandatory');
                if (!payload.password || payload.password.length < 8)
                    errors.push('Password must be >= 8 chars');
                if (!payload.terms_accepted)
                    errors.push('Terms must be accepted');
                return errors;
            };

            // Incomplete registration
            const failed = validateRegistration({
                name: 'Aditya',
                email: 'aditya@example.com',
                password: 'password123',
            });
            assert.ok(failed.includes('Phone is mandatory'));
            assert.ok(failed.includes('Terms must be accepted'));

            // Valid registration
            const passed = validateRegistration({
                name: 'Aditya',
                email: 'aditya@example.com',
                phone: '+91 98765 43210',
                password: 'password123',
                terms_accepted: true,
            });
            assert.equal(passed.length, 0);
        });

        it('supports login with either email or mobile phone', () => {
            const emailPayload = buildLoginPayload(
                'user@example.com',
                'secret',
            );
            assert.equal(emailPayload.email, 'user@example.com');
            assert.ok(!('login' in emailPayload));
            assert.ok(!('phone' in emailPayload));

            const phonePayload = buildLoginPayload('+919876543210', 'secret');
            assert.equal(phonePayload.email, '+919876543210');
        });
    });

    describe('Partner 10-Field Registration Specification', () => {
        it('validates all 10 required and optional partner onboarding fields', () => {
            interface PartnerRegistrationForm {
                name: string;
                email: string;
                phone: string;
                password: string;
                property_name: string;
                property_type: string;
                available_for: string;
                location: string;
                locality: string;
                description?: string;
                terms: boolean;
            }

            const validatePartnerForm = (
                form: Partial<PartnerRegistrationForm>,
            ) => {
                const errors: string[] = [];
                if (!form.name?.trim()) errors.push('Partner name required');
                if (!form.email?.trim()) errors.push('Email required');
                if (!form.phone?.trim()) errors.push('Mobile phone mandatory');
                if (!form.password || form.password.length < 8)
                    errors.push('Password min 8 chars');
                if (!form.property_name?.trim())
                    errors.push('Property name required');
                if (
                    !form.property_type ||
                    !isValidCanonicalCategory(form.property_type)
                ) {
                    errors.push(
                        'Property type must be one of 3 canonical categories',
                    );
                }
                if (
                    !form.available_for ||
                    !['all_genders', 'male_only', 'female_only'].includes(
                        form.available_for,
                    )
                ) {
                    errors.push(
                        'Available for must be a valid gender eligibility policy',
                    );
                }
                if (!form.location?.trim())
                    errors.push('City location required');
                if (!form.locality?.trim())
                    errors.push('Locality area required');
                if (!form.terms) errors.push('Terms acceptance required');
                return errors;
            };

            const validPartner: PartnerRegistrationForm = {
                name: 'K. Venkat Rao',
                email: 'venkat@stayhostel.com',
                phone: '+91 98765 43210',
                password: 'StrongPassword123!',
                property_name: 'Sri Lakshmi Luxury PG',
                property_type: 'hostels-pg',
                available_for: 'all_genders',
                location: 'Hyderabad',
                locality: 'Madhapur',
                description:
                    'Prime PG accommodation with Wi-Fi and attached washrooms',
                terms: true,
            };

            const errors = validatePartnerForm(validPartner);
            assert.equal(errors.length, 0);
            assert.equal(
                withPasswordConfirmation(validPartner).password_confirmation,
                validPartner.password,
            );

            // Verify canonical categories only
            const invalidCat = validatePartnerForm({
                ...validPartner,
                property_type: 'independent-hostel',
            });
            assert.ok(
                invalidCat.includes(
                    'Property type must be one of 3 canonical categories',
                ),
            );
        });
    });

    describe('Search Gender Filter Specification', () => {
        it('supports 3 gender filter values and maps correctly to API query parameters', () => {
            const getGenderFilterParams = (
                selectedGender: 'all' | 'male' | 'female',
            ) => {
                if (selectedGender === 'all') {
                    return {};
                }
                return {
                    gender: selectedGender,
                    gender_preference: selectedGender,
                };
            };

            assert.deepEqual(getGenderFilterParams('all'), {});
            assert.deepEqual(getGenderFilterParams('male'), {
                gender: 'male',
                gender_preference: 'male',
            });
            assert.deepEqual(getGenderFilterParams('female'), {
                gender: 'female',
                gender_preference: 'female',
            });
        });
    });

    describe('Wishlist Heart State Specification', () => {
        it('toggles property wishlist IDs idempotently', () => {
            let wishlistedIds = new Set<number>([101, 102]);

            const toggleWishlist = (id: number) => {
                const next = new Set(wishlistedIds);
                if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
                wishlistedIds = next;
            };

            assert.equal(wishlistedIds.has(101), true);
            assert.equal(wishlistedIds.has(103), false);

            // Add 103
            toggleWishlist(103);
            assert.equal(wishlistedIds.has(103), true);
            assert.equal(wishlistedIds.size, 3);

            // Remove 101
            toggleWishlist(101);
            assert.equal(wishlistedIds.has(101), false);
            assert.equal(wishlistedIds.size, 2);
        });
    });
});
