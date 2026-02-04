import { Routes } from '@angular/router';
import {
  guestGuard,
  authGuard,
  autoLoginGuard,
} from './core/guards/auth/auth.guard';
import {
  roleGuard,
  customerGuard,
  cookGuard,
  deliveryGuard,
  adminGuard,
} from './core/guards/role/role.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [autoLoginGuard],
    loadComponent: () =>
      import('./features/landing/landing.component').then(
        (m) => m.LandingComponent,
      ),
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },

  {
    path: 'customer',
    canActivate: [authGuard, customerGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/customer/customer-dashboard/customer-dashboard.component').then(
            (m) => m.CustomerDashboardComponent,
          ),
      },
      {
        path: 'browse-meals',
        loadComponent: () =>
          import('./features/customer/browse-meals/browse-meals.component').then(
            (m) => m.BrowseMealsComponent,
          ),
      },
      {
        path: 'meal/:id',
        loadComponent: () =>
          import('./features/customer/meal-detail/meal-detail.component').then(
            (m) => m.MealDetailComponent,
          ),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./features/customer/cart/cart.component').then(
            (m) => m.CartComponent,
          ),
      },
      {
        path: 'orders',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/customer/orders/orders.component').then(
                (m) => m.OrdersComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/customer/order-detail/order-detail.component').then(
                (m) => m.OrderDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./features/customer/favorites/favorites.component').then(
            (m) => m.FavoritesComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/customer/profile/customer-profile/customer-profile.component').then(
            (m) => m.CustomerProfileComponent,
          ),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
