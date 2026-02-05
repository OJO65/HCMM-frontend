import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';

/**
 * Landing Page Component
 * Welcome page for HomeMeals Marketplace
 * Showcases platform value proposition for customers, cooks, and delivery partners
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule,
    MatTabsModule
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  private readonly router = inject(Router);

  // Features for different user types
  customerFeatures = [
    {
      icon: 'restaurant_menu',
      title: 'Authentic Home Cooking',
      description: 'Discover delicious, home-cooked meals prepared with love by talented local chefs in your area.'
    },
    {
      icon: 'verified_user',
      title: 'Verified Chefs',
      description: 'All our cooks are verified and rated by the community. Browse reviews and ratings before ordering.'
    },
    {
      icon: 'delivery_dining',
      title: 'Fast Delivery',
      description: 'Get your meals delivered fresh and hot to your doorstep by our reliable delivery partners.'
    },
    {
      icon: 'payments',
      title: 'Secure Payments',
      description: 'Safe and easy payment options with buyer protection on every order you place.'
    }
  ];

  cookFeatures = [
    {
      icon: 'savings',
      title: 'Earn Extra Income',
      description: 'Turn your cooking skills into income. Set your own prices and work on your own schedule.'
    },
    {
      icon: 'people',
      title: 'Build Your Customer Base',
      description: 'Reach hungry customers in your area and grow your reputation as a trusted home chef.'
    },
    {
      icon: 'star',
      title: 'Get Recognized',
      description: 'Receive reviews and ratings. Top-rated chefs get featured and recommended to more customers.'
    },
    {
      icon: 'dashboard',
      title: 'Easy Management',
      description: 'Simple dashboard to manage your menu, track orders, and monitor your earnings in real-time.'
    }
  ];

  deliveryFeatures = [
    {
      icon: 'two_wheeler',
      title: 'Flexible Schedule',
      description: 'Choose when you want to work. Accept deliveries that fit your schedule and location.'
    },
    {
      icon: 'attach_money',
      title: 'Competitive Pay',
      description: 'Earn competitive rates per delivery plus tips. Track your earnings in real-time.'
    },
    {
      icon: 'navigation',
      title: 'Smart Routing',
      description: 'Get optimized routes for efficient deliveries. Deliver more orders in less time.'
    },
    {
      icon: 'support',
      title: '24/7 Support',
      description: 'Access support anytime you need help. We are here to ensure smooth deliveries.'
    }
  ];

  // Statistics to build trust
  stats = [
    { value: '10,000+', label: 'Happy Customers' },
    { value: '500+', label: 'Verified Cooks' },
    { value: '50,000+', label: 'Meals Delivered' },
    { value: '4.8/5', label: 'Average Rating' }
  ];

  // Popular cuisines/categories
  cuisines = [
    { name: 'Kenyan', icon: '🇰🇪', description: 'Traditional Kenyan dishes' },
    { name: 'Italian', icon: '🍝', description: 'Pasta, pizza & more' },
    { name: 'Indian', icon: '🍛', description: 'Spicy & flavorful curries' },
    { name: 'Chinese', icon: '🥢', description: 'Authentic Asian cuisine' },
    { name: 'Vegan', icon: '🥗', description: 'Plant-based meals' },
    { name: 'Desserts', icon: '🍰', description: 'Sweet treats & cakes' }
  ];

  // How it works steps
  customerSteps = [
    { step: 1, icon: 'search', title: 'Browse Meals', description: 'Explore home-cooked meals from verified chefs near you' },
    { step: 2, icon: 'shopping_cart', title: 'Place Order', description: 'Add to cart and checkout with secure payment' },
    { step: 3, icon: 'delivery_dining', title: 'Get Delivered', description: 'Track your order and enjoy fresh, hot meals at home' }
  ];

  cookSteps = [
    { step: 1, icon: 'app_registration', title: 'Sign Up', description: 'Create your cook profile and get verified' },
    { step: 2, icon: 'menu_book', title: 'Create Menu', description: 'Add your delicious dishes with photos and prices' },
    { step: 3, icon: 'trending_up', title: 'Start Earning', description: 'Accept orders and grow your business' }
  ];

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  navigateToRegister(role?: string): void {
    this.router.navigate(['/auth/register'], {
      queryParams: role ? { role } : {}
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}