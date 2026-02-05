import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRole } from '../../../models/user.model';

/* ---------- Nav Types ---------- */

type NavRouteItem = {
  label: string;
  route: string;
  icon: string;
};

type NavActionItem = {
  label: string;
  icon: string;
  action: () => void;
};

type NavItem = NavRouteItem | NavActionItem;

function isRouteItem(item: NavItem): item is NavRouteItem {
  return 'route' in item;
}

/* ---------- Role Navigation ---------- */

const ROLE_NAV: Record<UserRole, NavRouteItem[]> = {
  [UserRole.CUSTOMER]: [
    { label: 'Browse', route: '/customer/browse-meals', icon: 'restaurant_menu' },
    { label: 'Orders', route: '/customer/orders', icon: 'receipt_long' },
    { label: 'Favorites', route: '/customer/favorites', icon: 'favorite' }
  ],
  [UserRole.COOK]: [
    { label: 'Dashboard', route: '/cook/dashboard', icon: 'dashboard' },
    { label: 'Meals', route: '/cook/meals', icon: 'lunch_dining' },
    { label: 'Orders', route: '/cook/orders', icon: 'shopping_bag' },
    { label: 'Earnings', route: '/cook/earnings', icon: 'payments' }
  ],
  [UserRole.DELIVERY_GUY]: [
    { label: 'Dashboard', route: '/delivery/dashboard', icon: 'dashboard' },
    { label: 'Available', route: '/delivery/available-deliveries', icon: 'local_shipping' },
    { label: 'Active', route: '/delivery/active-deliveries', icon: 'directions_bike' },
    { label: 'History', route: '/delivery/history', icon: 'history' }
  ],
  [UserRole.ADMIN]: [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'admin_panel_settings' },
    { label: 'Users', route: '/admin/users', icon: 'groups' },
    { label: 'Orders', route: '/admin/orders', icon: 'list_alt' },
    { label: 'Analytics', route: '/admin/analytics', icon: 'insights' }
  ]
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private router = inject(Router);
  readonly authService = inject(AuthService);

  readonly UserRole = UserRole;

  @Input() transparent = false;

  mobileMenuOpen = signal(false);
  cartItemCount = signal(3); // connect later

  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;

  get navigationItems(): NavItem[] {
    const user = this.currentUser();

    if (!user) {
      return [
        { label: 'How it works', icon: 'info', action: () => this.scroll('how-it-works') },
        { label: 'Features', icon: 'bolt', action: () => this.scroll('features') }
      ];
    }

    return ROLE_NAV[user.role];
  }

  isRouteItem = isRouteItem;

  handleNav(item: NavItem) {
    if (isRouteItem(item)) {
      this.router.navigate([item.route]);
    } else {
      item.action();
    }
    this.mobileMenuOpen.set(false);
  }

  toggleMobile() {
    this.mobileMenuOpen.update(v => !v);
  }

  login() {
    this.router.navigate(['/auth/login']);
  }

  register() {
    this.router.navigate(['/auth/register']);
  }

  cart() {
    this.router.navigate(['/customer/cart']);
  }

  profile() {
    const u = this.currentUser();
    if (!u) return;

    const map: Record<UserRole, string> = {
      [UserRole.CUSTOMER]: '/customer/profile',
      [UserRole.COOK]: '/cook/profile',
      [UserRole.DELIVERY_GUY]: '/delivery/profile',
      [UserRole.ADMIN]: '/admin/settings'
    };

    this.router.navigate([map[u.role]]);
  }

  logout() {
    this.authService.logout();
  }

  scroll(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
