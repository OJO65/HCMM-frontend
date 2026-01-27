export enum UserRole {
    CUSTOMER = 'customer',
    COOK = 'cook',
    DELIVERY_GUY = 'delivery_guy',
    ADMIN = 'admin',
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    isVerified: boolean;
    isActive: boolean;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;

    // Role-specific properties
    cookProfile?: CookProfile;
    deliveryGuyProfile?: DeliveryGuyProfile;
    customerProfile?: CustomerProfile;
}

export interface CookProfile {
    bio?: string;
    specialties: string[];
    averageRating: number;
    totalReviews: number;
    totalOrders: number;
    isVerified: boolean;
    businessName?: string;
    businessAddress?: string;
    location: {
        address: string;
        latitude: number;
        longitude: number;
    };
}

export interface DeliveryGuyProfile {
    vehicleType: string;
    vehicleNumber: string;
    licenseNumber: string;
    isAvailable: boolean;
    currentLocation?: {
        latitude: number;
        longitude: number;
    };
    totalDeliveries: number;
    averageRating: number;
}

export interface CustomerProfile {
    defaultAddress?: {
        address: string;
        latitude: number;
        longitude: number;
        label?: string;
    };
    savedAddresses: Address[]
    totalOrders: number;
}

export interface Address {
    id: string;
    address: string;
    latitude: number;
    longitude: number;
    label?: string;
    isDefault: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface TokenPayload {
    sub: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
}