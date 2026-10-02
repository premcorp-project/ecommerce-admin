export interface WeightRange {
    minWeight: number;
    maxWeight: number;
    price: number;
}

export interface ZoneCity {
    name: string;
    normalized: string;
}

export interface DeliveryZone {
    _id: string;
    name: string;
    country: string;
    cities: ZoneCity[];
    weightRanges: WeightRange[];
    estimatedDays: number | null;
    isActive: boolean;
    isDefault: boolean;
    priority: number;
    createdAt: string;
    updatedAt: string;
}

export interface ZonesListResponse {
    zones: DeliveryZone[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
