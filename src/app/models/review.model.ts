/**
 * Review Model
 * Represents customer reviews and ratings
 */

export type ReviewType = 'meal' | 'cook' | 'delivery';

export interface BaseReview {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  orderId: string;
  rating: number; // 1-5
  comment?: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt?: Date;
  helpfulCount?: number;
  reportCount?: number;
  isVisible?: boolean;
}

export interface MealReview extends BaseReview {
  type: 'meal';
  mealId: string;
  mealName: string;
  cookId: string;
  aspects?: {
    taste?: number;
    presentation?: number;
    portionSize?: number;
    valueForMoney?: number;
  };
}

export interface CookReview extends BaseReview {
  type: 'cook';
  cookId: string;
  cookName: string;
  aspects?: {
    foodQuality?: number;
    packaging?: number;
    preparationTime?: number;
    communication?: number;
  };
}

export interface DeliveryReview extends BaseReview {
  type: 'delivery';
  deliveryPersonId: string;
  deliveryPersonName: string;
  aspects?: {
    speed?: number;
    professionalism?: number;
    foodCondition?: number;
    communication?: number;
  };
}

export type Review = MealReview | CookReview | DeliveryReview;

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  aspectRatings?: {
    [key: string]: number;
  };
}

export interface ReviewFilters {
  rating?: number[];
  dateFrom?: Date;
  dateTo?: Date;
  verified?: boolean;
  hasImages?: boolean;
  hasComment?: boolean;
}

export interface ReviewResponse {
  id: string;
  reviewId: string;
  responderId: string;
  responderName: string;
  responderRole: 'cook' | 'admin';
  response: string;
  createdAt: Date;
  updatedAt?: Date;
}