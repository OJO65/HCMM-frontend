import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

// Import custom pipes
import { CurrencyKesPipe } from '../../../shared/pipes/currency/currency-kes.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time/time-ago.pipe';

// Import models
import { Order, OrderStatus } from '../../../models/order.model';
import { Meal } from '../../../models/meal.model';
import { User, UserRole } from '../../../models/user.model';

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  favoriteCount: number;
  totalSpent: number;
}

interface QuickAction {
  icon: string;
  label: string;
  route: string;
  color: string;
  badge?: number;
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule,
    CurrencyKesPipe,
    TimeAgoPipe,
  ],
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDashboardComponent implements OnInit {
  private router = inject(Router);

  // Signals for reactive state management
  loading = signal<boolean>(true);
  user = signal<User | null>(null);
  recentOrders = signal<Order[]>([]);
  recommendedMeals = signal<Meal[]>([]);
  stats = signal<DashboardStats>({
    totalOrders: 0,
    activeOrders: 0,
    favoriteCount: 0,
    totalSpent: 0,
  });

  // Computed values
  greeting = computed(() => {
    const hour = new Date().getHours();
    const name = this.user()?.firstName || 'there';
    
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 18) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  });

  hasActiveOrders = computed(() => this.stats().activeOrders > 0);
  hasRecentOrders = computed(() => this.recentOrders().length > 0);
  hasRecommendations = computed(() => this.recommendedMeals().length > 0);

  // Quick actions with dynamic badges
  quickActions = computed<QuickAction[]>(() => [
    {
      icon: 'restaurant_menu',
      label: 'Browse Meals',
      route: '/customer/browse-meals',
      color: 'primary',
    },
    {
      icon: 'shopping_cart',
      label: 'View Cart',
      route: '/customer/cart',
      color: 'accent',
      badge: 0, // This would come from cart service
    },
    {
      icon: 'receipt_long',
      label: 'My Orders',
      route: '/customer/orders',
      color: 'primary',
      badge: this.stats().activeOrders,
    },
    {
      icon: 'favorite',
      label: 'Favorites',
      route: '/customer/favorites',
      color: 'warn',
      badge: this.stats().favoriteCount,
    },
  ]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /**
   * Load all dashboard data
   * TODO: Replace with actual service calls when backend is ready
   */
  private loadDashboardData(): void {
    // Simulate API call
    setTimeout(() => {
      this.user.set(this.getMockUser());
      this.stats.set(this.getMockStats());
      this.recentOrders.set(this.getMockRecentOrders());
      this.recommendedMeals.set(this.getMockRecommendedMeals());
      this.loading.set(false);
    }, 800);
  }

  /**
   * Navigate to specific route
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /**
   * Navigate to order detail
   */
  viewOrderDetail(orderId: string): void {
    this.router.navigate(['/customer/orders', orderId]);
  }

  /**
   * Navigate to meal detail
   */
  viewMealDetail(mealId: string): void {
    this.router.navigate(['/customer/meal', mealId]);
  }

  /**
   * Get status color for order status chip
   */
  getStatusColor(status: OrderStatus): string {
    const statusColors: Record<OrderStatus, string> = {
      pending: 'accent',
      confirmed: 'primary',
      preparing: 'primary',
      ready: 'accent',
      picked_up: 'accent',
      delivering: 'accent',
      delivered: 'primary',
      cancelled: 'warn',
    };
    return statusColors[status] || 'primary';
  }

  /**
   * Get status icon for order status
   */
  getStatusIcon(status: OrderStatus): string {
    const statusIcons: Record<OrderStatus, string> = {
      pending: 'schedule',
      confirmed: 'check_circle',
      preparing: 'restaurant',
      ready: 'done_all',
      picked_up: 'local_shipping',
      delivering: 'two_wheeler',
      delivered: 'check_circle_outline',
      cancelled: 'cancel',
    };
    return statusIcons[status] || 'help';
  }

  /**
   * Format order status for display
   */
  formatStatus(status: OrderStatus): string {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // ============================================================================
  // MOCK DATA METHODS - REMOVE WHEN CONNECTING TO BACKEND
  // ============================================================================

  private getMockUser(): User {
    return {
      id: 'user_123',
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.CUSTOMER,
      phone: '+254712345678',
      avatar: undefined,
      isVerified: true,
      isActive: true,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-02-15'),
      customerProfile: {
        totalOrders: 24,
        savedAddresses: [],
        defaultAddress: {
          address: '123 Main Street, Milimani, Kisumu',
          latitude: -0.0917,
          longitude: 34.7680,
          label: 'Home',
        },
      },
    };
  }

  private getMockStats(): DashboardStats {
    return {
      totalOrders: 24,
      activeOrders: 2,
      favoriteCount: 8,
      totalSpent: 12450.50,
    };
  }

  private getMockRecentOrders(): Order[] {
    return [
      {
        id: 'order_001',
        customerId: 'user_123',
        cookId: 'cook_456',
        cookName: 'Chef Maria\'s Kitchen',
        items: [
          {
            mealId: 'meal_001',
            mealName: 'Beef Pilau with Kachumbari',
            quantity: 2,
            price: 350,
            subtotal: 700,
          },
          {
            mealId: 'meal_002',
            mealName: 'Chicken Biriyani',
            quantity: 1,
            price: 400,
            subtotal: 400,
          },
        ],
        subtotal: 1100,
        deliveryFee: 150,
        total: 1250,
        status: 'delivering',
        deliveryAddress: {
          street: '123 Main Street',
          area: 'Milimani',
          city: 'Kisumu',
          instructions: 'Gate code: 1234',
        },
        createdAt: new Date('2024-02-16T10:30:00'),
        estimatedDeliveryTime: new Date('2024-02-16T12:00:00'),
      },
      {
        id: 'order_002',
        customerId: 'user_123',
        cookId: 'cook_789',
        cookName: 'Mama Njeri\'s Homemade',
        items: [
          {
            mealId: 'meal_003',
            mealName: 'Githeri Special',
            quantity: 1,
            price: 250,
            subtotal: 250,
          },
        ],
        subtotal: 250,
        deliveryFee: 100,
        total: 350,
        status: 'preparing',
        deliveryAddress: {
          street: '123 Main Street',
          area: 'Milimani',
          city: 'Kisumu',
        },
        createdAt: new Date('2024-02-16T09:15:00'),
        estimatedDeliveryTime: new Date('2024-02-16T11:30:00'),
      },
      {
        id: 'order_003',
        customerId: 'user_123',
        cookId: 'cook_456',
        cookName: 'Chef Maria\'s Kitchen',
        items: [
          {
            mealId: 'meal_004',
            mealName: 'Nyama Choma with Ugali',
            quantity: 1,
            price: 600,
            subtotal: 600,
          },
        ],
        subtotal: 600,
        deliveryFee: 150,
        total: 750,
        status: 'delivered',
        deliveryAddress: {
          street: '123 Main Street',
          area: 'Milimani',
          city: 'Kisumu',
        },
        createdAt: new Date('2024-02-15T18:30:00'),
        deliveredAt: new Date('2024-02-15T20:15:00'),
      },
    ];
  }

  private getMockRecommendedMeals(): Meal[] {
    return [
      {
        id: 'meal_005',
        name: 'Fish Fillet with Coconut Rice',
        description: 'Fresh tilapia fillet served with aromatic coconut rice and vegetables',
        price: 450,
        cookId: 'cook_456',
        cookName: 'Chef Maria\'s Kitchen',
        category: 'Main Course',
        cuisine: 'Coastal',
        prepTime: 30,
        isAvailable: true,
        imageUrl: '/assets/images/meals/fish-coconut-rice.jpg',
        rating: 4.8,
        reviewCount: 124,
        tags: ['Healthy', 'Pescatarian', 'Gluten-Free'],
        createdAt: new Date('2024-02-01'),
      },
      {
        id: 'meal_006',
        name: 'Mukimo with Beef Stew',
        description: 'Traditional Kikuyu dish - mashed green peas, potatoes and maize with tender beef stew',
        price: 320,
        cookId: 'cook_789',
        cookName: 'Mama Njeri\'s Homemade',
        category: 'Main Course',
        cuisine: 'Kikuyu',
        prepTime: 40,
        isAvailable: true,
        imageUrl: '/assets/images/meals/mukimo-beef.jpg',
        rating: 4.9,
        reviewCount: 89,
        tags: ['Traditional', 'Comfort Food', 'Filling'],
        createdAt: new Date('2024-01-28'),
      },
      {
        id: 'meal_007',
        name: 'Chapati and Beans',
        description: 'Soft layered chapatis with spiced dengu beans',
        price: 180,
        cookId: 'cook_321',
        cookName: 'Jiko Express',
        category: 'Vegetarian',
        cuisine: 'Kenyan',
        prepTime: 20,
        isAvailable: true,
        imageUrl: '/assets/images/meals/chapati-beans.jpg',
        rating: 4.6,
        reviewCount: 203,
        tags: ['Vegetarian', 'Budget-Friendly', 'Quick'],
        createdAt: new Date('2024-02-05'),
      },
      {
        id: 'meal_008',
        name: 'Matoke Special',
        description: 'Steamed plantains in rich tomato and coconut sauce',
        price: 280,
        cookId: 'cook_654',
        cookName: 'Lake View Kitchen',
        category: 'Main Course',
        cuisine: 'Luhya',
        prepTime: 35,
        isAvailable: true,
        imageUrl: '/assets/images/meals/matoke.jpg',
        rating: 4.7,
        reviewCount: 67,
        tags: ['Traditional', 'Vegan', 'Authentic'],
        createdAt: new Date('2024-02-03'),
      },
    ];
  }
}