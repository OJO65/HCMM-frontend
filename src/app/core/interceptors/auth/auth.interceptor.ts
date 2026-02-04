import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { catchError, Observable, switchMap, throwError } from 'rxjs';
import { StorageService } from '../../services/storage/storage.service';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storageService = inject(StorageService);
  const authService = inject(AuthService);

  const skipAuth =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/forgot-password');

  if (skipAuth) {
    return next(req);
  }

  const token = storageService.getAccessToken();

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      if (error.status !== 401 || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      // Attempt token refresh
      return authService.refreshToken().pipe(
        switchMap(() => {
          const newToken = authService.getAccessToken();

          if (!newToken) {
            // CRITICAL FIX: Call logout immediately when token is invalid
            authService.logout();
            return throwError(() => new Error('Token refresh failed'));
          }

          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`,
            },
          });

          return next(retryReq);
        }),
        catchError((refreshError) => {
          // Only logout if this is a refresh service error, not our validation error
          if (refreshError.message !== 'Token refresh failed') {
            authService.logout();
          }
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

export const headersInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const cloneReq = req.clone({
    setHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  return next(cloneReq);
};