/**
 * Order Model
 * Represents a customer order in the food delivery system
 */

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface DeliveryAddress {
  street: string;
  area: string;
  city: string;
  instructions?: string;
  latitude?: number;
  longitude?: number;
}

export interface OrderItem {
  mealId: string;
  mealName: string;
  quantity: number;
  price: number;
  subtotal: number;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  customerId: string;
  cookId: string;
  cookName: string;
  deliveryPersonId?: string;
  deliveryPersonName?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee?: number;
  discount?: number;
  total: number;
  status: OrderStatus;
  deliveryAddress: DeliveryAddress;
  paymentMethod?: 'cash' | 'mpesa' | 'card';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  notes?: string;
  createdAt: Date;
  confirmedAt?: Date;
  preparedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
}

export interface OrderSummary {
  id: string;
  cookName: string;
  itemCount: number;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  estimatedDeliveryTime?: Date;
}

export interface OrderFilters {
  status?: OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  cookId?: string;
}