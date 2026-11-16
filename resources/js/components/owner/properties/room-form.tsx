import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { FormField } from '@/components/shared/form-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
    PropertyRoomData,
    PropertyRoomStatus,
    PropertyRoomTypeData,
} from '@/types';

type RoomFormProps = {
    actionUrl: string;
    method: 'post' | 'put';
    roomTypes: PropertyRoomTypeData[];
    operationalStatuses: {
        value: PropertyRoomStatus;
        label: string;
        description: string;
    }[];
    existingRoom?: PropertyRoomData;
    structuralLocked?: boolean;
    submitLabel?: string;
};

export function RoomForm({
    actionUrl,
    method,
    roomTypes,
    operationalStatuses,
    existingRoom,
    structuralLocked = false,
    submitLabel = 'Save Physical Room',
}: RoomFormProps) {
    const form = useForm({
        property_room_type_id: existingRoom
            ? String(existingRoom.property_room_type_id)
            : roomTypes[0]
              ? String(roomTypes[0].id)
              : '',
        room_number: existingRoom?.room_number ?? '',
        floor_number: existingRoom?.floor_number ?? '',
        wing_name: existingRoom?.wing_name ?? '',
        building_name: existingRoom?.building_name ?? '',
        description: existingRoom?.description ?? '',
        operational_status: existingRoom?.operational_status ?? 'active',
    });

    const selectedType = roomTypes.find(
        (rt) => String(rt.id) === form.data.property_room_type_id,
    );

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (method === 'post') {
            form.post(actionUrl);
        } else {
            form.put(actionUrl);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {structuralLocked && (
                <Alert variant="warning">
                    <AlertTitle>Approved Room Configuration</AlertTitle>
                    <AlertDescription>
                        Verified room numbers and room-type assignments require
                        an active Re-Verification Amendment to alter. You can
                        still change the operational room status (Active /
                        Maintenance / Blocked / Inactive) cleanly at any time.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Physical Room Details</CardTitle>
                    <CardDescription>
                        Enter actual physical room numbers only. Occupancy
                        capacity comes directly from the linked room type—no bed
                        identifiers are stored or managed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <FormField
                        id="room-number"
                        label="Physical Room Number"
                        required
                        error={form.errors.room_number}
                        hint="Numeric or alphanumeric room code unique inside this property (e.g. 101, A-101, North-201)."
                        className="min-w-0"
                    >
                        {(a11y) => (
                            <Input
                                {...a11y}
                                name="room_number"
                                disabled={structuralLocked || form.processing}
                                value={form.data.room_number}
                                autoCorrect="off"
                                spellCheck={false}
                                placeholder="e.g. 101"
                                onChange={(e) =>
                                    form.setData('room_number', e.target.value)
                                }
                            />
                        )}
                    </FormField>

                    <FormField
                        id="room-type-id"
                        label="Room Type Configuration"
                        required
                        error={form.errors.property_room_type_id}
                        hint={
                            selectedType
                                ? `Derived occupancy: ${selectedType.max_guests_per_room} guest(s) · ${selectedType.is_air_conditioned ? 'AC' : 'Non-AC'}`
                                : undefined
                        }
                        className="min-w-0"
                    >
                        {(a11y) => (
                            <Select
                                value={form.data.property_room_type_id}
                                disabled={structuralLocked || form.processing}
                                onValueChange={(v) =>
                                    form.setData('property_room_type_id', v)
                                }
                            >
                                <SelectTrigger
                                    id={a11y.id}
                                    className="w-full min-w-0"
                                >
                                    <SelectValue placeholder="Select room type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roomTypes.map((rt) => (
                                        <SelectItem
                                            key={rt.id}
                                            value={String(rt.id)}
                                        >
                                            {rt.name} ({rt.max_guests_per_room}{' '}
                                            {rt.max_guests_per_room === 1
                                                ? 'guest'
                                                : 'guests'}
                                            )
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </FormField>

                    <FormField
                        id="room-floor"
                        label="Floor (Optional)"
                        error={form.errors.floor_number}
                        className="min-w-0"
                    >
                        {(a11y) => (
                            <Input
                                {...a11y}
                                name="floor_number"
                                disabled={form.processing}
                                value={form.data.floor_number}
                                placeholder="e.g. Ground, 1, 2"
                                onChange={(e) =>
                                    form.setData('floor_number', e.target.value)
                                }
                            />
                        )}
                    </FormField>

                    <FormField
                        id="room-wing"
                        label="Wing Label (Optional)"
                        error={form.errors.wing_name}
                        className="min-w-0"
                    >
                        {(a11y) => (
                            <Input
                                {...a11y}
                                name="wing_name"
                                disabled={form.processing}
                                value={form.data.wing_name}
                                placeholder="e.g. East Wing, Block A"
                                onChange={(e) =>
                                    form.setData('wing_name', e.target.value)
                                }
                            />
                        )}
                    </FormField>

                    <FormField
                        id="room-building"
                        label="Building Name (Optional)"
                        error={form.errors.building_name}
                        className="min-w-0"
                    >
                        {(a11y) => (
                            <Input
                                {...a11y}
                                name="building_name"
                                disabled={form.processing}
                                value={form.data.building_name}
                                placeholder="Optional building label"
                                onChange={(e) =>
                                    form.setData(
                                        'building_name',
                                        e.target.value,
                                    )
                                }
                            />
                        )}
                    </FormField>

                    <FormField
                        id="room-operational-status"
                        label="Operational Status"
                        required
                        error={form.errors.operational_status}
                        className="min-w-0"
                    >
                        {(a11y) => (
                            <Select
                                value={form.data.operational_status}
                                disabled={form.processing}
                                onValueChange={(v) =>
                                    form.setData(
                                        'operational_status',
                                        v as PropertyRoomStatus,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id={a11y.id}
                                    className="w-full min-w-0"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {operationalStatuses.map((s) => (
                                        <SelectItem
                                            key={s.value}
                                            value={s.value}
                                        >
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </FormField>

                    <FormField
                        id="room-description"
                        label="Internal Room Notes (Optional)"
                        error={form.errors.description}
                        className="min-w-0 md:col-span-2"
                    >
                        {(a11y) => (
                            <Textarea
                                {...a11y}
                                name="description"
                                disabled={form.processing}
                                rows={3}
                                value={form.data.description}
                                placeholder="Optional internal housekeeping or layout reference note..."
                                onChange={(e) =>
                                    form.setData('description', e.target.value)
                                }
                            />
                        )}
                    </FormField>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" loading={form.processing}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
