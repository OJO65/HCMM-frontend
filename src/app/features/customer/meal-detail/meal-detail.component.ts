import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';

import { CartItem, AddOn } from '../../../models/cart.model';
import { CartService } from '../../../core/services/cart/cart.service';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';

import { Meal } from '../../../models/meal.model';
import { Review } from '../../../models/review.model';
import { CurrencyKesPipe } from '../../../shared/pipes/currency/currency-kes.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time/time-ago.pipe';

// ─── Local type (only used internally for add-on selection state) ─────────────
interface SelectableAddOn extends AddOn {
  selected: boolean;
}

type ReviewFilter = 'all' | '5' | '4' | '3' | '2' | '1';

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-meal-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatTooltipModule,
    MatTabsModule,
    CurrencyKesPipe,
    TimeAgoPipe,
  ],
  templateUrl: './meal-detail.component.html',
  styleUrls: ['./meal-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private cartService = inject(CartService);

  // ── State ──────────────────────────────────────────────────────────────────
  loading = signal(true);
  meal = signal<Meal | null>(null);
  reviews = signal<Review[]>([]);

  quantity = signal(1);
  addOns = signal<SelectableAddOn[]>([]);
  specialInstructions = signal('');
  isFavorite = signal(false);

  selectedImageIndex = signal(0);
  reviewFilter = signal<ReviewFilter>('all');
  showAllReviews = signal(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  totalPrice = computed(() => {
    const m = this.meal();
    if (!m) return 0;

    const basePrice = m.price * this.quantity();
    const addOnsPrice = this.addOns()
      .filter(a => a.selected)
      .reduce((sum, a) => sum + a.price, 0) * this.quantity();

    return basePrice + addOnsPrice;
  });

  selectedAddOns = computed(() =>
    this.addOns().filter(a => a.selected)
  );

  addOnsTotal = computed(() =>
    this.selectedAddOns().reduce((sum, a) => sum + a.price, 0)
  );

  images = computed(() => [
    '/assets/images/meals/placeholder-1.jpg',
    '/assets/images/meals/placeholder-2.jpg',
    '/assets/images/meals/placeholder-3.jpg',
  ]);

  filteredReviews = computed(() => {
    const filter = this.reviewFilter();
    const allReviews = this.reviews();
    if (filter === 'all') return allReviews;
    return allReviews.filter(r => Math.floor(r.rating) === +filter);
  });

  displayedReviews = computed(() => {
    const reviews = this.filteredReviews();
    return this.showAllReviews() ? reviews : reviews.slice(0, 3);
  });

  reviewStats = computed(() => {
    const reviews = this.reviews();
    if (reviews.length === 0) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    return reviews.reduce((stats, r) => {
      const star = Math.floor(r.rating) as 1 | 2 | 3 | 4 | 5;
      stats[star] = (stats[star] || 0) + 1;
      return stats;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<1 | 2 | 3 | 4 | 5, number>);
  });

  averageRating = computed(() => this.meal()?.rating ?? 0);
  totalReviews = computed(() => this.meal()?.reviewCount ?? 0);

  canAddToCart = computed(() => {
    const m = this.meal();
    return m != null && m.isAvailable && this.quantity() > 0;
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/customer/browse-meals']);
      return;
    }
    this.loadMeal(id);
  }

  // ── Public methods ─────────────────────────────────────────────────────────
  goBack(): void {
    this.location.back();
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  incrementQuantity(): void {
    this.quantity.update(q => q + 1);
  }

  decrementQuantity(): void {
    this.quantity.update(q => Math.max(1, q - 1));
  }

  toggleAddOn(id: string): void {
    this.addOns.update(addOns =>
      addOns.map(a => a.id === id ? { ...a, selected: !a.selected } : a)
    );
  }

  updateInstructions(value: string): void {
    this.specialInstructions.set(value);
  }

  toggleFavorite(): void {
    this.isFavorite.update(v => !v);
    // TODO: Call favorites service
  }

  setReviewFilter(filter: ReviewFilter): void {
    this.reviewFilter.set(filter);
    this.showAllReviews.set(false);
  }

  toggleShowAllReviews(): void {
    this.showAllReviews.update(v => !v);
  }

  addToCart(): void {
    if (!this.canAddToCart()) return;

    const meal = this.meal()!;

    const cartItem: CartItem = {
      id: meal.id,
      meal: {
        id: meal.id,
        name: meal.name,
        cookName: meal.cookName ?? '',
        price: meal.price,
      },
      quantity: this.quantity(),
      // Strip the local `selected` field — CartItem.AddOn only needs id/name/price
      addOns: this.selectedAddOns().map(({ id, name, price }) => ({ id, name, price })),
      specialInstructions: this.specialInstructions() || undefined,
    };

    this.cartService.addItem(cartItem);
    console.log('Added to cart:', cartItem);
    // TODO: Replace with a snackbar notification
  }

  getStarArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  getStarPercentage(star: number): number {
    const total = this.totalReviews();
    if (total === 0) return 0;
    return (this.reviewStats()[star as 1 | 2 | 3 | 4 | 5] / total) * 100;
  }

  trackByReviewId(_: number, review: Review): string {
    return review.id;
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private loadMeal(id: string): void {
    // TODO: Replace with actual service call
    setTimeout(() => {
      const meal = this.getMockMeal(id);
      if (!meal) {
        this.router.navigate(['/customer/browse-meals']);
        return;
      }
      this.meal.set(meal);
      this.addOns.set(this.getMockAddOns());
      this.reviews.set(this.getMockReviews());
      this.loading.set(false);
    }, 600);
  }

  // ── Mock data (remove when connecting backend) ─────────────────────────────
  private getMockMeal(id: string): Meal | null {
    const meals: Record<string, Meal> = {
      'm001': {
        id: 'm001',
        name: 'Beef Pilau with Kachumbari',
        description: 'Aromatic spiced rice with tender beef chunks, served with fresh tomato and onion kachumbari. Our signature pilau is slow-cooked with cumin, cardamom, and cinnamon for maximum flavor.',
        price: 350,
        category: 'Main Course',
        cuisine: 'Kenyan',
        prepTime: 35,
        cookId: 'cook_001',
        cookName: "Chef Maria's Kitchen",
        rating: 4.8,
        reviewCount: 312,
        tags: ['Filling', 'Spiced', 'Popular'],
        dietaryTags: ['Halal'],
        isAvailable: true,
        createdAt: new Date(),
      },
    };

    return meals[id] ?? meals['m001'];
  }

  private getMockAddOns(): SelectableAddOn[] {
    return [
      { id: 'a1', name: 'Extra Beef', price: 80, selected: false },
      { id: 'a2', name: 'Avocado', price: 50, selected: false },
      { id: 'a3', name: 'Fried Egg', price: 30, selected: false },
      { id: 'a4', name: 'Extra Kachumbari', price: 20, selected: false },
    ];
  }

  private getMockReviews(): Review[] {
    const meal = this.meal();
    if (!meal) return [];

    return [
      {
        type: 'meal',
        id: 'r1',
        customerId: 'u001',
        customerName: 'Jane Ochieng',
        customerAvatar: undefined,
        orderId: 'ord_001',
        mealId: meal.id,
        mealName: meal.name,
        cookId: meal.cookId,
        rating: 5,
        comment: 'Absolutely delicious! The beef was so tender and the spices were perfect. Will definitely order again.',
        isVerifiedPurchase: true,
        createdAt: new Date('2024-02-10'),
        helpfulCount: 12,
      },
      {
        type: 'meal',
        id: 'r2',
        customerId: 'u002',
        customerName: 'John Kamau',
        customerAvatar: undefined,
        orderId: 'ord_002',
        mealId: meal.id,
        mealName: meal.name,
        cookId: meal.cookId,
        rating: 4,
        comment: 'Really good pilau. My only complaint is I wish there was more meat, but the flavor was excellent.',
        isVerifiedPurchase: true,
        createdAt: new Date('2024-02-08'),
        helpfulCount: 8,
      },
      {
        type: 'meal',
        id: 'r3',
        customerId: 'u003',
        customerName: 'Mary Wanjiru',
        customerAvatar: undefined,
        orderId: 'ord_003',
        mealId: meal.id,
        mealName: meal.name,
        cookId: meal.cookId,
        rating: 5,
        comment: "This is the best pilau I've had from any delivery service. Chef Maria really knows her spices!",
        isVerifiedPurchase: true,
        createdAt: new Date('2024-02-05'),
        helpfulCount: 15,
      },
      {
        type: 'meal',
        id: 'r4',
        customerId: 'u004',
        customerName: 'David Otieno',
        customerAvatar: undefined,
        orderId: 'ord_004',
        mealId: meal.id,
        mealName: meal.name,
        cookId: meal.cookId,
        rating: 4,
        comment: 'Very tasty and arrived hot. Generous portion size too.',
        isVerifiedPurchase: true,
        createdAt: new Date('2024-02-03'),
        helpfulCount: 5,
      },
      {
        type: 'meal',
        id: 'r5',
        customerId: 'u005',
        customerName: 'Grace Akinyi',
        customerAvatar: undefined,
        orderId: 'ord_005',
        mealId: meal.id,
        mealName: meal.name,
        cookId: meal.cookId,
        rating: 5,
        comment: 'The kachumbari was so fresh and complemented the pilau perfectly. Highly recommend!',
        isVerifiedPurchase: true,
        createdAt: new Date('2024-01-28'),
        helpfulCount: 10,
      },
    ];
  }
}