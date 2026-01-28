import {
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
):
  | boolean
  | UrlTree
  | Observable<boolean | UrlTree>
  | Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  const returnUrl = state.url;

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl },
  });
};

export const guestGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  const userRole = authService.getUserRole();

  const dashboardRoutes: Record<string, string> = {
    customer: '/customer/dashboard',
    cook: '/cook/dashboard',
    delivery_guy: '/delivery_guy/dashboard',
    admin: '/admin/dashboard',
  };

  const dashboardUrl =
    userRole && dashboardRoutes[userRole] ? dashboardRoutes[userRole] : '/';
  return router.createUrlTree([dashboardUrl]);
};

export const autoLoginGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const userRole = authService.getUserRole();

    const dashboardRoutes: Record<string, string> = {
      customer: '/customer/dashboard',
      cook: '/cook/dashboard',
      delivery_guy: '/delivery_guy/dashboard',
      admin: '/admin/dashboard',
    };

    const dashboardUrl = userRole
      && dashboardRoutes[userRole] ?
      dashboardRoutes[userRole]
      : '/customer/dashboard';
    return router.createUrlTree([dashboardUrl]);
  }
  return true;
};
