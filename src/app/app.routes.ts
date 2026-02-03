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
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';

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
      { path: 'register', component: RegisterComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
    ],
  },
];
