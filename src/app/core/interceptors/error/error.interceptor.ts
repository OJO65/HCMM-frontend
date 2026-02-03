import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
  HttpEventType,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, mergeMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

/**
 * Configuration interface for error interceptor behavior
 */
export interface ErrorInterceptorConfig {
  showToast?: boolean;
  logErrors?: boolean;
  redirectOn403?: boolean;
  clearAuthOn401?: boolean;
}

/**
 * Default configuration for the error interceptor
 */
const DEFAULT_CONFIG: ErrorInterceptorConfig = {
  showToast: true,
  logErrors: true,
  redirectOn403: true,
  clearAuthOn401: true,
};

/**
 * Enhanced error payload for better error handling
 */
export interface EnhancedError {
  status: number;
  message: string;
  timestamp: number;
  url: string;
  method: string;
  error?: any;
}

/**
 * Production-grade HTTP Error Interceptor
 *
 * Features:
 * - Comprehensive error handling for all HTTP status codes
 * - User-friendly toast notifications
 * - Automatic retry logic with exponential backoff
 * - Memory leak prevention
 * - Detailed error logging
 * - 401/403 navigation handling
 * - Configurable behavior
 *
 * @param req - The HTTP request
 * @param next - The next handler in the chain
 * @returns Observable of HTTP events
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const toastr = inject(ToastrService);

  // Check for custom configuration in request headers
  const config = extractConfig(req);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const enhancedError = createEnhancedError(error, req);

      // Log error if configured
      if (config.logErrors) {
        logError(enhancedError);
      }

      // Handle the error based on status code
      handleHttpError(error, req, router, toastr, config);

      // Return enhanced error for component-level handling
      return throwError(() => enhancedError);
    }),
  );
};

/**
 * Logging Interceptor for development and debugging
 * Tracks request/response lifecycle with performance metrics
 */
export const loggingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const startTime = Date.now();
  let requestLogged = false;

  return next(req).pipe(
    tap((event) => {
      // Log request once
      if (!requestLogged) {
        console.log(`📤 ${req.method} ${req.url}`);
        if (req.body && Object.keys(req.body).length > 0) {
          console.log('Request body:', req.body);
        }
        requestLogged = true;
      }

      // Log successful response
      if (event.type === HttpEventType.Response) {
        const elapsed = Date.now() - startTime;
        console.log(`✅ ${req.method} ${req.url} completed in ${elapsed}ms`);
        console.log('Response:', event.status, event.statusText);
      }
    }),
    catchError((error) => {
      const elapsed = Date.now() - startTime;
      console.error(
        `❌ ${req.method} ${req.url} failed after ${elapsed}ms`,
        error,
      );
      return throwError(() => error);
    }),
  );
};

/**
 * Retry Interceptor with exponential backoff
 * Only retries GET requests on network errors or 5xx server errors
 */
export const retryInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (req.method !== 'GET') return next(req);
  if (req.headers.has('X-Skip-Retry')) return next(req);

  const maxRetries = 3;
  const initialDelay = 1000;

  let attempt = 0;

  const handleRequest = (): Observable<HttpEvent<unknown>> =>
    next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const retryAttempt = attempt + 1;
        const shouldRetry =
          retryAttempt <= maxRetries &&
          (error.status === 0 || error.status >= 500);

        if (!shouldRetry) {
          return throwError(() => error);
        }

        attempt++;

        const delayMs = Math.pow(2, retryAttempt - 1) * initialDelay;
        console.log(`🔄 Retry attempt ${retryAttempt}/${maxRetries} after ${delayMs}ms`);

        return timer(delayMs).pipe(mergeMap(() => handleRequest()));
      }),
    );

  return handleRequest();
};
/**
 * Extract configuration from request headers
 */
function extractConfig(req: HttpRequest<unknown>): ErrorInterceptorConfig {
  const config = { ...DEFAULT_CONFIG };

  if (req.headers.has('X-No-Toast')) {
    config.showToast = false;
  }

  if (req.headers.has('X-No-Error-Log')) {
    config.logErrors = false;
  }

  return config;
}

/**
 * Create an enhanced error object with additional context
 */
function createEnhancedError(
  error: HttpErrorResponse,
  req: HttpRequest<unknown>,
): EnhancedError {
  return {
    status: error.status,
    message: extractErrorMessage(error),
    timestamp: Date.now(),
    url: req.url,
    method: req.method,
    error: error.error,
  };
}

/**
 * Extract user-friendly error message from HTTP error
 */
function extractErrorMessage(error: HttpErrorResponse): string {
  if (error.error instanceof ErrorEvent) {
    // Client-side or network error
    return `Network Error: ${error.error.message}`;
  }

  // Server-side error
  switch (error.status) {
    case 0:
      return 'Unable to connect to server. Please check your internet connection.';
    case 400:
      return error.error?.message || 'Bad request. Please check your input.';
    case 401:
      return error.error?.message || 'Unauthorized. Please login again.';
    case 403:
      return (
        error.error?.message ||
        'You do not have permission to access this resource.'
      );
    case 404:
      return error.error?.message || 'The requested resource was not found.';
    case 409:
      return (
        error.error?.message ||
        'A conflict occurred. The resource may already exist.'
      );
    case 422:
      return extractValidationMessage(error);
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Internal server error. Please try again later.';
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    case 503:
      return 'Service unavailable. Please try again later.';
    case 504:
      return 'Gateway timeout. The server took too long to respond.';
    default:
      return (
        error.error?.message || `Error ${error.status}: ${error.statusText}`
      );
  }
}

/**
 * Extract validation error messages from 422 responses
 */
function extractValidationMessage(error: HttpErrorResponse): string {
  if (error.error?.errors && typeof error.error.errors === 'object') {
    const fields = Object.keys(error.error.errors);
    if (fields.length > 0) {
      return `Validation failed: ${fields.join(', ')}`;
    }
  }
  return error.error?.message || 'Validation error. Please check your input.';
}

/**
 * Handle HTTP errors with appropriate actions
 */
function handleHttpError(
  error: HttpErrorResponse,
  req: HttpRequest<unknown>,
  router: Router,
  toastr: ToastrService,
  config: ErrorInterceptorConfig,
): void {
  const message = extractErrorMessage(error);

  // Handle specific status codes
  switch (error.status) {
    case 401:
      handleUnauthorized(error, req, toastr, router, config, message);
      break;

    case 403:
      handleForbidden(router, toastr, config, message);
      break;

    case 422:
      handleValidationError(error, toastr, config);
      break;

    default:
      // Show toast for all other errors
      if (config.showToast) {
        toastr.error(message, 'Error', {
          timeOut: 5000,
          closeButton: true,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      }
  }
}

/**
 * Handle 401 Unauthorized errors
 */
function handleUnauthorized(
  error: HttpErrorResponse,
  req: HttpRequest<unknown>,
  toastr: ToastrService,
  router: Router,
  config: ErrorInterceptorConfig,
  message: string,
): void {
  // Don't show toast for refresh token endpoint failures
  const isRefreshToken =
    req.url.includes('/auth/refresh') || req.url.includes('/refresh-token');

  if (!isRefreshToken && config.showToast) {
    toastr.error(message, 'Authentication Error', {
      timeOut: 5000,
      closeButton: true,
      progressBar: true,
    });
  }

  // Clear authentication and redirect to login
  if (config.clearAuthOn401 && !isRefreshToken) {
    clearAuthentication();

    // Use setTimeout to avoid navigation during route change
    setTimeout(() => {
      router.navigate(['/login'], {
        queryParams: { returnUrl: router.url },
      });
    }, 100);
  }
}

/**
 * Handle 403 Forbidden errors
 */
function handleForbidden(
  router: Router,
  toastr: ToastrService,
  config: ErrorInterceptorConfig,
  message: string,
): void {
  if (config.showToast) {
    toastr.error(message, 'Access Denied', {
      timeOut: 5000,
      closeButton: true,
      progressBar: true,
    });
  }

  if (config.redirectOn403) {
    // Use setTimeout to avoid navigation during route change
    setTimeout(() => {
      router.navigate(['/unauthorized']);
    }, 100);
  }
}

/**
 * Handle 422 Validation errors with field-specific messages
 */
function handleValidationError(
  error: HttpErrorResponse,
  toastr: ToastrService,
  config: ErrorInterceptorConfig,
): void {
  if (!config.showToast) {
    return;
  }

  const validationErrors = error.error?.errors;

  if (validationErrors && typeof validationErrors === 'object') {
    // Show individual field errors
    Object.entries(validationErrors).forEach(([field, messages]) => {
      const errorMessages = Array.isArray(messages) ? messages : [messages];
      errorMessages.forEach((msg: any) => {
        toastr.error(
          typeof msg === 'string' ? msg : JSON.stringify(msg),
          `Validation Error: ${field}`,
          {
            timeOut: 5000,
            closeButton: true,
            progressBar: true,
          },
        );
      });
    });
  } else {
    // Show general validation error
    toastr.error(
      error.error?.message || 'Validation error. Please check your input.',
      'Validation Error',
      {
        timeOut: 5000,
        closeButton: true,
        progressBar: true,
      },
    );
  }
}

/**
 * Clear authentication tokens and user data
 */
function clearAuthentication(): void {
  // Clear all possible auth storage locations
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('auth');

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('auth');
  } catch (e) {
    console.error('Error clearing authentication:', e);
  }
}

/**
 * Log error details for debugging and monitoring
 */
function logError(error: EnhancedError): void {
  const logStyle = 'color: red; font-weight: bold;';

  console.group(`%c🚨 HTTP Error ${error.status}`, logStyle);
  console.error('Message:', error.message);
  console.error('URL:', `${error.method} ${error.url}`);
  console.error('Timestamp:', new Date(error.timestamp).toISOString());

  if (error.error) {
    console.error('Error Details:', error.error);
  }

  console.groupEnd();
}
