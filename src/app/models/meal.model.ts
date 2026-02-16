/**
 * Meal Model
 * Represents a meal offered by a cook
 */

export type MealCategory =
  | 'Main Course'
  | 'Appetizer'
  | 'Dessert'
  | 'Beverage'
  | 'Vegetarian'
  | 'Snack'
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner';

export type CuisineType =
  | 'Kenyan'
  | 'Coastal'
  | 'Kikuyu'
  | 'Luhya'
  | 'Luo'
  | 'Somali'
  | 'Indian'
  | 'Chinese'
  | 'Continental'
  | 'Italian'
  | 'Fast Food'
  | 'Fusion';

export type DietaryTag =
  | 'Vegetarian'
  | 'Vegan'
  | 'Gluten-Free'
  | 'Dairy-Free'
  | 'Halal'
  | 'Pescatarian'
  | 'Nut-Free'
  | 'Spicy'
  | 'Low-Carb'
  | 'Keto'
  | 'Healthy';

export interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface Meal {
  id: string;
  name: string;
  description: string;
  price: number;
  cookId: string;
  cookName: string;
  category: MealCategory;
  cuisine: CuisineType;
  prepTime: number; // in minutes
  servingSize?: string;
  isAvailable: boolean;
  availableUntil?: Date;
  imageUrl?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  dietaryTags?: DietaryTag[];
  nutritionalInfo?: NutritionalInfo;
  ingredients?: string[];
  allergens?: string[];
  spiceLevel?: 1 | 2 | 3 | 4 | 5;
  isPopular?: boolean;
  isFeatured?: boolean;
  discountPercentage?: number;
  originalPrice?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface MealFilters {
  category?: MealCategory[];
  cuisine?: CuisineType[];
  minPrice?: number;
  maxPrice?: number;
  maxPrepTime?: number;
  dietaryTags?: DietaryTag[];
  minRating?: number;
  isAvailable?: boolean;
  cookId?: string;
  searchQuery?: string;
}

export interface MealWithDistance extends Meal {
  distance?: number; // in kilometers
  estimatedDeliveryTime?: number; // in minutes
}