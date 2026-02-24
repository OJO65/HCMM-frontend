/**
 * Favorite Model
 * Slim snapshot stored in localStorage — only what the card needs
 */
export interface FavoriteMeal {
  id: string;
  name: string;
  cookName: string;
  price: number;
  rating: number;
  reviewCount: number;
  cuisine: string;
  prepTime: number;
  dietaryTags?: string[];
  savedAt: Date;
}