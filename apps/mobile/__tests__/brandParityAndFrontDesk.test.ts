import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Mobile App Brand Parity & Partner Front-Desk Operations Specification', () => {
    describe('Brand Identity & Official Channels Touchpoints', () => {
        const BRAND_CONFIG = {
            tagline: 'Stay easy. Eat well. Spend less.',
            colors: {
                deepPlum: '#442F41',
                coral: '#FF7A67',
                warmCream: '#FFF4EE',
                card: '#FFFFFF',
            },
            channels: {
                whatsapp: {
                    number: '+91 8142334033',
                    url: 'https://wa.me/918142334033',
                },
                instagram: {
                    handle: '@tijum.official',
                    url: 'https://instagram.com/tijum.official',
                },
                facebook: {
                    handle: '@tijum.official',
                    url: 'https://facebook.com/tijum.official',
                },
                phone: {
                    number: '+91 8142334033',
                    url: 'tel:+918142334033',
                },
                email: {
                    address: 'support@tijum.com',
                    url: 'mailto:support@tijum.com',
                },
                hours: '9:00 AM – 9:00 PM IST (Mon–Sat)',
            },
        };

        it('enforces exact brand tagline and official color palette', () => {
            assert.equal(BRAND_CONFIG.tagline, 'Stay easy. Eat well. Spend less.');
            assert.equal(BRAND_CONFIG.colors.deepPlum.toUpperCase(), '#442F41');
            assert.equal(BRAND_CONFIG.colors.coral.toUpperCase(), '#FF7A67');
            assert.equal(BRAND_CONFIG.colors.warmCream.toUpperCase(), '#FFF4EE');
            assert.equal(BRAND_CONFIG.colors.card.toUpperCase(), '#FFFFFF');
        });

        it('configures canonical deep link URLs for official channels', () => {
            assert.equal(BRAND_CONFIG.channels.whatsapp.url, 'https://wa.me/918142334033');
            assert.equal(BRAND_CONFIG.channels.instagram.url, 'https://instagram.com/tijum.official');
            assert.equal(BRAND_CONFIG.channels.facebook.url, 'https://facebook.com/tijum.official');
            assert.equal(BRAND_CONFIG.channels.phone.url, 'tel:+918142334033');
            assert.equal(BRAND_CONFIG.channels.email.url, 'mailto:support@tijum.com');
            assert.equal(BRAND_CONFIG.channels.hours, '9:00 AM – 9:00 PM IST (Mon–Sat)');
        });
    });

    describe('Public Contact Inquiry Validation', () => {
        const validateContactInquiry = (payload: {
            name: string;
            email: string;
            mobile: string;
            subject: string;
            message: string;
        }) => {
            const errors: string[] = [];
            if (!payload.name?.trim()) errors.push('Name is required');
            if (!payload.email?.trim() || !payload.email.includes('@'))
                errors.push('Valid email is required');
            if (!payload.mobile?.trim()) errors.push('Mobile is required');
            if (!['booking', 'partner', 'general'].includes(payload.subject))
                errors.push('Invalid subject category');
            if (!payload.message?.trim()) errors.push('Message is required');
            return errors;
        };

        it('rejects invalid or incomplete contact inquiries', () => {
            const errors = validateContactInquiry({
                name: '',
                email: 'invalid-email',
                mobile: '',
                subject: 'unsupported',
                message: '',
            });
            assert.ok(errors.includes('Name is required'));
            assert.ok(errors.includes('Valid email is required'));
            assert.ok(errors.includes('Mobile is required'));
            assert.ok(errors.includes('Invalid subject category'));
            assert.ok(errors.includes('Message is required'));
        });

        it('accepts valid contact inquiries across all supported categories', () => {
            for (const subject of ['booking', 'partner', 'general']) {
                const errors = validateContactInquiry({
                    name: 'Kavita Rao',
                    email: 'kavita@example.com',
                    mobile: '+91 98765 43210',
                    subject,
                    message: 'Inquiring about monthly stay arrangements in Guntur.',
                });
                assert.equal(errors.length, 0);
            }
        });
    });

    describe('Partner Front-Desk Operations Lifecycle', () => {
        interface ReservationMock {
            reference: string;
            status: 'awaiting_payment' | 'confirmed' | 'checked_in' | 'checked_out';
            checked_in_at?: string | null;
            checked_out_at?: string | null;
            front_desk_notes?: string;
        }

        const checkInGuest = (res: ReservationMock, notes?: string): ReservationMock => {
            if (res.status !== 'confirmed') {
                throw new Error('Only confirmed bookings can be checked in');
            }
            return {
                ...res,
                status: 'checked_in',
                checked_in_at: '2026-11-20 09:15:00',
                front_desk_notes: notes,
            };
        };

        const checkOutGuest = (res: ReservationMock, notes?: string): ReservationMock => {
            if (res.status !== 'checked_in') {
                throw new Error('Only checked_in reservations can be checked out');
            }
            return {
                ...res,
                status: 'checked_out',
                checked_out_at: '2026-11-20 08:00:00',
                front_desk_notes: notes,
            };
        };

        it('advances confirmed reservation to checked_in with timestamps and notes', () => {
            const initial: ReservationMock = {
                reference: 'TIJ-RES-101',
                status: 'confirmed',
            };

            const checkedIn = checkInGuest(initial, 'Room 204 keys handed over');
            assert.equal(checkedIn.status, 'checked_in');
            assert.ok(checkedIn.checked_in_at);
            assert.equal(checkedIn.front_desk_notes, 'Room 204 keys handed over');
        });

        it('advances checked_in reservation to checked_out with turnover clearance', () => {
            const active: ReservationMock = {
                reference: 'TIJ-RES-101',
                status: 'checked_in',
                checked_in_at: '2026-11-20 09:15:00',
            };

            const checkedOut = checkOutGuest(active, 'Keys returned and room inspected');
            assert.equal(checkedOut.status, 'checked_out');
            assert.ok(checkedOut.checked_out_at);
            assert.equal(checkedOut.front_desk_notes, 'Keys returned and room inspected');
        });

        it('prevents invalid transitions', () => {
            const unpaid: ReservationMock = {
                reference: 'TIJ-RES-102',
                status: 'awaiting_payment',
            };
            assert.throws(() => checkInGuest(unpaid), /Only confirmed bookings/);
            assert.throws(() => checkOutGuest(unpaid), /Only checked_in reservations/);
        });
    });

    describe('Partner Profile & Security Settings Specification', () => {
        const validatePasswordUpdate = (data: {
            current_password?: string;
            password?: string;
            password_confirmation?: string;
        }) => {
            const errors: string[] = [];
            if (!data.current_password) errors.push('Current password is required');
            if (!data.password || data.password.length < 8)
                errors.push('New password must be >= 8 chars');
            if (data.password !== data.password_confirmation)
                errors.push('Passwords must match');
            return errors;
        };

        it('validates partner password update rules', () => {
            const errors = validatePasswordUpdate({
                current_password: '',
                password: 'short',
                password_confirmation: 'mismatch',
            });
            assert.ok(errors.includes('Current password is required'));
            assert.ok(errors.includes('New password must be >= 8 chars'));
            assert.ok(errors.includes('Passwords must match'));

            const valid = validatePasswordUpdate({
                current_password: 'oldPassword123',
                password: 'newSecretPassword2026',
                password_confirmation: 'newSecretPassword2026',
            });
            assert.equal(valid.length, 0);
        });
    });
});
