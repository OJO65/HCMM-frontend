// src/app/models/cart.model.ts

export interface AddOn {
  id: string;
  name: string;
  price: number;
}

export interface Meal {
  id: string;
  name: string;
  cookName: string;
  price: number;
  imageUrl?: string;
}

export interface CartItem {
  id: string;
  meal: Meal;
  quantity: number;
  addOns: AddOn[];
  specialInstructions?: string;
}
