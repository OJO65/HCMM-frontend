import { TestBed } from '@angular/core/testing';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpEvent,
  HttpResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { authInterceptor, headersInterceptor } from './auth.interceptor';
import { StorageService } from '../../services/storage/storage.service';
import { AuthService } from '../../services/auth/auth.service';

// Mock AuthResponse interface - adjust based on your actual AuthResponse type
// Import User and AuthResponse types to ensure compatibility
import type { User } from '../../../models/user.model';
import type { AuthResponse } from '../../../models/user.model';

interface MockAuthResponse extends AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

describe('Auth Interceptors Test Suite', () => {
  let mockStorageService: jasmine.SpyObj<StorageService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockNext: jasmine.Spy<HttpHandlerFn>;
  let mockHttpResponse: HttpResponse<unknown>;
  let mockAuthResponse: MockAuthResponse;

  beforeEach(() => {
    // Create comprehensive spy objects
    mockStorageService = jasmine.createSpyObj('StorageService', [
      'getAccessToken',
      'setAccessToken',
      'removeAccessToken',
    ]);

    mockAuthService = jasmine.createSpyObj('AuthService', [
      'refreshToken',
      'getAccessToken',
      'logout',
    ]);

    // Create mock auth response
    mockAuthResponse = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
      user: {} as User,
    };

    // Create mock HTTP response
    mockHttpResponse = new HttpResponse({
      status: 200,
      body: { data: 'test' },
    });

    // Create mock next handler
    mockNext = jasmine.createSpy('next').and.returnValue(of(mockHttpResponse));

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });
  });

  afterEach(() => {
    // Reset all spies
    mockStorageService.getAccessToken.calls.reset();
    mockAuthService.refreshToken.calls.reset();
    mockAuthService.getAccessToken.calls.reset();
    mockAuthService.logout.calls.reset();
    mockNext.calls.reset();
  });

  describe('authInterceptor', () => {
    describe('Skip authentication for public endpoints', () => {
      it('should skip auth for /auth/login endpoint', (done) => {
        const req = new HttpRequest('POST', '/auth/login', {});

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            expect(mockStorageService.getAccessToken).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(req);
            done();
          });
        });
      });

      it('should skip auth for /auth/register endpoint', (done) => {
        const req = new HttpRequest('POST', '/auth/register', {});

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            expect(mockStorageService.getAccessToken).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(req);
            done();
          });
        });
      });

      it('should skip auth for /auth/refresh endpoint', (done) => {
        const req = new HttpRequest('POST', '/auth/refresh', {});

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            expect(mockStorageService.getAccessToken).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(req);
            done();
          });
        });
      });

      it('should skip auth for /auth/forgot-password endpoint', (done) => {
        const req = new HttpRequest('POST', '/auth/forgot-password', {});

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            expect(mockStorageService.getAccessToken).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledWith(req);
            done();
          });
        });
      });

      it('should skip auth when URL contains /auth/login as substring', (done) => {
        const req = new HttpRequest(
          'POST',
          'https://api.example.com/auth/login',
          {},
        );

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            expect(mockStorageService.getAccessToken).not.toHaveBeenCalled();
            done();
          });
        });
      });
    });

    describe('Token attachment for protected endpoints', () => {
      it('should attach Authorization header when access token exists', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        const accessToken = 'test-access-token-123';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            expect(mockStorageService.getAccessToken).toHaveBeenCalledTimes(1);

            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.get('Authorization')).toBe(
              `Bearer ${accessToken}`,
            );
            done();
          });
        });
      });

      it('should not attach Authorization header when access token is null', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        mockStorageService.getAccessToken.and.returnValue(null);

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.has('Authorization')).toBe(false);
            done();
          });
        });
      });

      it('should not attach Authorization header when access token is empty string', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        mockStorageService.getAccessToken.and.returnValue('');

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.has('Authorization')).toBe(false);
            done();
          });
        });
      });

      it('should handle multiple consecutive requests with tokens', (done) => {
        const req1 = new HttpRequest('GET', '/api/resource1', {});
        const req2 = new HttpRequest('GET', '/api/resource2', {});
        const accessToken = 'test-token';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        TestBed.runInInjectionContext(() => {
          authInterceptor(req1, mockNext).subscribe(() => {
            authInterceptor(req2, mockNext).subscribe(() => {
              expect(mockStorageService.getAccessToken).toHaveBeenCalledTimes(
                2,
              );
              expect(mockNext).toHaveBeenCalledTimes(2);
              done();
            });
          });
        });
      });
    });

    describe('401 Error handling and token refresh', () => {
      // CORRECTED TEST - Replace the failing test with this version

      it('should attempt token refresh on 401 error', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        const accessToken = 'old-token';
        const newToken = 'new-refreshed-token';

        mockStorageService.getAccessToken.and.returnValue(accessToken);
        mockAuthService.refreshToken.and.returnValue(of(mockAuthResponse));
        mockAuthService.getAccessToken.and.returnValue(newToken);

        const error401 = new HttpErrorResponse({
          status: 401,
          statusText: 'Unauthorized',
        });

        // ✅ FIX: Use callFake to make first call fail, retry succeed
        let callCount = 0;
        mockNext.and.callFake(() => {
          callCount++;
          if (callCount === 1) {
            // First call fails with 401
            return throwError(() => error401);
          }
          // Retry after refresh succeeds
          return of(mockHttpResponse);
        });

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            next: () => {
              expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
              done();
            },
            error: (error) => {
              fail('Should not error after successful refresh');
            },
          });
        });
      });
      
      it('should retry request with new token after successful refresh', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        const oldToken = 'old-token';
        const newToken = 'new-refreshed-token';

        mockStorageService.getAccessToken.and.returnValue(oldToken);
        mockAuthService.refreshToken.and.returnValue(of(mockAuthResponse));
        mockAuthService.getAccessToken.and.returnValue(newToken);

        const error401 = new HttpErrorResponse({ status: 401 });
        let callCount = 0;

        mockNext.and.callFake((request: HttpRequest<unknown>) => {
          callCount++;
          if (callCount === 1) {
            return throwError(() => error401);
          } else {
            // Second call with new token should succeed
            expect(request.headers.get('Authorization')).toBe(
              `Bearer ${newToken}`,
            );
            return of(mockHttpResponse);
          }
        });

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            next: () => {
              expect(mockNext).toHaveBeenCalledTimes(2);
              expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
              done();
            },
          });
        });
      });

      it('should not attempt refresh for /auth/refresh endpoint on 401', (done) => {
        const req = new HttpRequest('POST', '/auth/refresh', {});
        const error401 = new HttpErrorResponse({ status: 401 });

        mockNext.and.returnValue(throwError(() => error401));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: (error) => {
              expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
              expect(error.status).toBe(401);
              done();
            },
          });
        });
      });

      it('should call logout when token refresh fails', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        const accessToken = 'old-token';

        mockStorageService.getAccessToken.and.returnValue(accessToken);
        mockAuthService.refreshToken.and.returnValue(
          throwError(() => new Error('Refresh failed')),
        );

        const error401 = new HttpErrorResponse({ status: 401 });
        mockNext.and.returnValue(throwError(() => error401));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: () => {
              expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
              done();
            },
          });
        });
      });

      it('should call logout when refreshed token is null', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        const accessToken = 'old-token';

        mockStorageService.getAccessToken.and.returnValue(accessToken);
        mockAuthService.refreshToken.and.returnValue(of(mockAuthResponse));
        mockAuthService.getAccessToken.and.returnValue(null);

        const error401 = new HttpErrorResponse({ status: 401 });
        mockNext.and.returnValue(throwError(() => error401));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: (error) => {
              expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
              expect(error.message).toBe('Token refresh failed');
              done();
            },
          });
        });
      });

      it('should call logout when refreshed token is empty string', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        const accessToken = 'old-token';

        mockStorageService.getAccessToken.and.returnValue(accessToken);
        mockAuthService.refreshToken.and.returnValue(of(mockAuthResponse));
        mockAuthService.getAccessToken.and.returnValue('');

        const error401 = new HttpErrorResponse({ status: 401 });
        mockNext.and.returnValue(throwError(() => error401));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: () => {
              expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
              done();
            },
          });
        });
      });
    });

    describe('Non-401 error handling', () => {
      it('should pass through 403 errors without refresh attempt', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        const accessToken = 'valid-token';

        mockStorageService.getAccessToken.and.returnValue(accessToken);

        const error403 = new HttpErrorResponse({
          status: 403,
          statusText: 'Forbidden',
        });

        mockNext.and.returnValue(throwError(() => error403));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: (error) => {
              expect(error.status).toBe(403);
              expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
              expect(mockAuthService.logout).not.toHaveBeenCalled();
              done();
            },
          });
        });
      });

      it('should pass through 404 errors without refresh attempt', (done) => {
        const req = new HttpRequest('GET', '/api/nonexistent', {});
        const accessToken = 'valid-token';

        mockStorageService.getAccessToken.and.returnValue(accessToken);

        const error404 = new HttpErrorResponse({ status: 404 });
        mockNext.and.returnValue(throwError(() => error404));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: (error) => {
              expect(error.status).toBe(404);
              expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
              done();
            },
          });
        });
      });

      it('should pass through 500 errors without refresh attempt', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        const accessToken = 'valid-token';

        mockStorageService.getAccessToken.and.returnValue(accessToken);

        const error500 = new HttpErrorResponse({
          status: 500,
          statusText: 'Internal Server Error',
        });

        mockNext.and.returnValue(throwError(() => error500));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: (error) => {
              expect(error.status).toBe(500);
              expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
              done();
            },
          });
        });
      });

      it('should handle network errors without refresh attempt', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', {});
        const accessToken = 'valid-token';

        mockStorageService.getAccessToken.and.returnValue(accessToken);

        const networkError = new HttpErrorResponse({
          status: 0,
          statusText: 'Unknown Error',
          error: new Error('Network error'),
        });

        mockNext.and.returnValue(throwError(() => networkError));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: (error) => {
              expect(error.status).toBe(0);
              expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
              done();
            },
          });
        });
      });
    });

    describe('Edge cases and complex scenarios', () => {
      it('should handle requests with existing headers', (done) => {
        const req = new HttpRequest('GET', '/api/protected-resource', null, {
          headers: new HttpHeaders({
            'X-Custom-Header': 'custom-value',
          }),
        });
        const accessToken = 'test-token';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.get('Authorization')).toBe(
              `Bearer ${accessToken}`,
            );
            expect(modifiedReq.headers.get('X-Custom-Header')).toBe(
              'custom-value',
            );
            done();
          });
        });
      });

      it('should handle POST requests with body', (done) => {
        const requestBody = { username: 'test', password: 'password' };
        const req = new HttpRequest('POST', '/api/data', requestBody);
        const accessToken = 'test-token';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.body).toEqual(requestBody);
            expect(modifiedReq.headers.get('Authorization')).toBe(
              `Bearer ${accessToken}`,
            );
            done();
          });
        });
      });

      it('should handle PUT requests', (done) => {
        const req = new HttpRequest('PUT', '/api/resource/123', {
          data: 'updated',
        });
        const accessToken = 'test-token';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.method).toBe('PUT');
            expect(modifiedReq.headers.get('Authorization')).toBe(
              `Bearer ${accessToken}`,
            );
            done();
          });
        });
      });

      it('should handle DELETE requests', (done) => {
        const req = new HttpRequest('DELETE', '/api/resource/123');
        const accessToken = 'test-token';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.method).toBe('DELETE');
            expect(modifiedReq.headers.get('Authorization')).toBe(
              `Bearer ${accessToken}`,
            );
            done();
          });
        });
      });

      it('should handle URLs with query parameters', (done) => {
        const req = new HttpRequest('GET', '/api/resource?page=1&limit=10', {});
        const accessToken = 'test-token';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.url).toContain('page=1');
            expect(modifiedReq.headers.get('Authorization')).toBe(
              `Bearer ${accessToken}`,
            );
            done();
          });
        });
      });

      it('should maintain request immutability when cloning', (done) => {
        const originalReq = new HttpRequest('GET', '/api/resource', {});
        const accessToken = 'test-token';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        TestBed.runInInjectionContext(() => {
          authInterceptor(originalReq, mockNext).subscribe(() => {
            // Original request should not be modified
            expect(originalReq.headers.has('Authorization')).toBe(false);

            // Modified request should have the header
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.has('Authorization')).toBe(true);
            done();
          });
        });
      });

      it('should use req.clone() with setHeaders for adding authorization', (done) => {
        const originalReq = new HttpRequest('GET', '/api/resource', {});
        const accessToken = 'test-token';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        TestBed.runInInjectionContext(() => {
          authInterceptor(originalReq, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;

            // Verify the request was cloned properly
            expect(modifiedReq).not.toBe(originalReq);
            expect(modifiedReq.url).toBe(originalReq.url);
            expect(modifiedReq.method).toBe(originalReq.method);
            expect(modifiedReq.headers.get('Authorization')).toBe(
              `Bearer ${accessToken}`,
            );
            done();
          });
        });
      });
    });

    describe('Observable operators and pipeline', () => {
      it('should use pipe() with catchError for error handling', (done) => {
        const req = new HttpRequest('GET', '/api/resource', {});
        const accessToken = 'test-token';
        mockStorageService.getAccessToken.and.returnValue(accessToken);

        const error404 = new HttpErrorResponse({ status: 404 });
        mockNext.and.returnValue(throwError(() => error404));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: (error) => {
              // Verify error was caught and re-thrown via catchError
              expect(error.status).toBe(404);
              done();
            },
          });
        });
      });

      it('should use switchMap when retrying after token refresh', (done) => {
        const req = new HttpRequest('GET', '/api/resource', {});
        const oldToken = 'old-token';
        const newToken = 'new-token';

        mockStorageService.getAccessToken.and.returnValue(oldToken);
        mockAuthService.refreshToken.and.returnValue(of(mockAuthResponse));
        mockAuthService.getAccessToken.and.returnValue(newToken);

        const error401 = new HttpErrorResponse({ status: 401 });
        let firstCall = true;

        mockNext.and.callFake(() => {
          if (firstCall) {
            firstCall = false;
            return throwError(() => error401);
          }
          return of(mockHttpResponse);
        });

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            next: (response) => {
              // Verify switchMap allowed the retry after refresh
              expect(response).toBe(mockHttpResponse);
              expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
              done();
            },
          });
        });
      });

      it('should use catchError in token refresh flow to handle failures', (done) => {
        const req = new HttpRequest('GET', '/api/resource', {});
        mockStorageService.getAccessToken.and.returnValue('old-token');

        const refreshError = new Error('Token service unavailable');
        mockAuthService.refreshToken.and.returnValue(
          throwError(() => refreshError),
        );

        const error401 = new HttpErrorResponse({ status: 401 });
        mockNext.and.returnValue(throwError(() => error401));

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            error: (error) => {
              // Verify catchError in refresh flow handled the error
              expect(mockAuthService.logout).toHaveBeenCalled();
              expect(error).toBe(refreshError);
              done();
            },
          });
        });
      });

      it('should properly chain Observable operators in refresh flow', (done) => {
        const req = new HttpRequest('GET', '/api/resource', {});
        mockStorageService.getAccessToken.and.returnValue('old-token');
        mockAuthService.refreshToken.and.returnValue(of(mockAuthResponse));
        mockAuthService.getAccessToken.and.returnValue('new-token');

        const error401 = new HttpErrorResponse({ status: 401 });
        let callCount = 0;

        mockNext.and.callFake(() => {
          callCount++;
          if (callCount === 1) {
            return throwError(() => error401);
          }
          return of(mockHttpResponse);
        });

        TestBed.runInInjectionContext(() => {
          authInterceptor(req, mockNext).subscribe({
            next: () => {
              // Verify the full operator chain: next().pipe(catchError -> refreshToken.pipe(switchMap, catchError))
              expect(callCount).toBe(2);
              expect(mockAuthService.refreshToken).toHaveBeenCalled();
              done();
            },
          });
        });
      });
    });
  });

  describe('headersInterceptor', () => {
    describe('Content-Type header', () => {
      it('should add Content-Type header as application/json', (done) => {
        const req = new HttpRequest('POST', '/api/data', { test: 'data' });

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            done();
          });
        });
      });

      it('should override existing Content-Type header', (done) => {
        const req = new HttpRequest(
          'POST',
          '/api/data',
          { test: 'data' },
          {
            headers: new HttpHeaders({
              'Content-Type': 'text/plain',
            }),
          },
        );

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            done();
          });
        });
      });
    });

    describe('Accept header', () => {
      it('should add Accept header as application/json', (done) => {
        const req = new HttpRequest('GET', '/api/data', {});

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.get('Accept')).toBe('application/json');
            done();
          });
        });
      });

      it('should override existing Accept header', (done) => {
        const req = new HttpRequest('GET', '/api/data', null, {
          headers: new HttpHeaders({
            Accept: 'text/html',
          }),
        });

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.get('Accept')).toBe('application/json');
            done();
          });
        });
      });
    });

    describe('Header combinations', () => {
      it('should add both Content-Type and Accept headers', (done) => {
        const req = new HttpRequest('POST', '/api/data', { test: 'data' });

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            expect(modifiedReq.headers.get('Accept')).toBe('application/json');
            done();
          });
        });
      });

      it('should preserve other custom headers while adding standard headers', (done) => {
        const req = new HttpRequest(
          'POST',
          '/api/data',
          { test: 'data' },
          {
            headers: new HttpHeaders({
              'X-Custom-Header': 'custom-value',
              'X-Request-ID': '12345',
            }),
          },
        );

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            expect(modifiedReq.headers.get('Accept')).toBe('application/json');
            expect(modifiedReq.headers.get('X-Custom-Header')).toBe(
              'custom-value',
            );
            expect(modifiedReq.headers.get('X-Request-ID')).toBe('12345');
            done();
          });
        });
      });
    });

    describe('Request types', () => {
      it('should handle GET requests', (done) => {
        const req = new HttpRequest('GET', '/api/data', {});

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.method).toBe('GET');
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            done();
          });
        });
      });

      it('should handle POST requests', (done) => {
        const req = new HttpRequest('POST', '/api/data', { test: 'data' });

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.method).toBe('POST');
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            done();
          });
        });
      });

      it('should handle PUT requests', (done) => {
        const req = new HttpRequest('PUT', '/api/data/1', { test: 'updated' });

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.method).toBe('PUT');
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            done();
          });
        });
      });

      it('should handle DELETE requests', (done) => {
        const req = new HttpRequest('DELETE', '/api/data/1');

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.method).toBe('DELETE');
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            done();
          });
        });
      });

      it('should handle PATCH requests', (done) => {
        const req = new HttpRequest('PATCH', '/api/data/1', { field: 'value' });

        TestBed.runInInjectionContext(() => {
          headersInterceptor(req, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq.method).toBe('PATCH');
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            done();
          });
        });
      });
    });

    describe('Request immutability', () => {
      it('should not modify the original request', (done) => {
        const originalReq = new HttpRequest('POST', '/api/data', {
          test: 'data',
        });
        const originalHeaderCount = originalReq.headers.keys().length;

        TestBed.runInInjectionContext(() => {
          headersInterceptor(originalReq, mockNext).subscribe(() => {
            // Original request should remain unchanged
            expect(originalReq.headers.keys().length).toBe(originalHeaderCount);
            expect(originalReq.headers.has('Content-Type')).toBe(false);
            expect(originalReq.headers.has('Accept')).toBe(false);
            done();
          });
        });
      });

      it('should create a new request instance', (done) => {
        const originalReq = new HttpRequest('POST', '/api/data', {
          test: 'data',
        });

        TestBed.runInInjectionContext(() => {
          headersInterceptor(originalReq, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;
            expect(modifiedReq).not.toBe(originalReq);
            done();
          });
        });
      });

      it('should use req.clone() with setHeaders to add headers', (done) => {
        const originalReq = new HttpRequest('POST', '/api/data', {
          test: 'data',
        });

        TestBed.runInInjectionContext(() => {
          headersInterceptor(originalReq, mockNext).subscribe(() => {
            const modifiedReq = mockNext.calls.mostRecent()
              .args[0] as HttpRequest<unknown>;

            // Verify cloning preserved everything except added headers
            expect(modifiedReq.url).toBe(originalReq.url);
            expect(modifiedReq.method).toBe(originalReq.method);
            expect(modifiedReq.body).toEqual(originalReq.body);
            expect(modifiedReq.headers.get('Content-Type')).toBe(
              'application/json',
            );
            expect(modifiedReq.headers.get('Accept')).toBe('application/json');
            done();
          });
        });
      });
    });
  });

  describe('Interceptor chaining scenarios', () => {
    it('should work correctly when both interceptors are chained', (done) => {
      const req = new HttpRequest('POST', '/api/data', { test: 'data' });
      const accessToken = 'test-token';
      mockStorageService.getAccessToken.and.returnValue(accessToken);

      TestBed.runInInjectionContext(() => {
        // First apply headers interceptor
        headersInterceptor(req, (headersModifiedReq) => {
          // Then apply auth interceptor
          return authInterceptor(headersModifiedReq, mockNext);
        }).subscribe(() => {
          const finalReq = mockNext.calls.mostRecent()
            .args[0] as HttpRequest<unknown>;

          // Should have all headers from both interceptors
          expect(finalReq.headers.get('Content-Type')).toBe('application/json');
          expect(finalReq.headers.get('Accept')).toBe('application/json');
          expect(finalReq.headers.get('Authorization')).toBe(
            `Bearer ${accessToken}`,
          );
          done();
        });
      });
    });

    it('should handle errors correctly through interceptor chain', (done) => {
      const req = new HttpRequest('POST', '/api/data', { test: 'data' });
      const accessToken = 'test-token';
      mockStorageService.getAccessToken.and.returnValue(accessToken);

      const error500 = new HttpErrorResponse({ status: 500 });
      mockNext.and.returnValue(throwError(() => error500));

      TestBed.runInInjectionContext(() => {
        headersInterceptor(req, (headersModifiedReq) => {
          return authInterceptor(headersModifiedReq, mockNext);
        }).subscribe({
          error: (error) => {
            expect(error.status).toBe(500);
            // Should not attempt logout for non-401 errors
            expect(mockAuthService.logout).not.toHaveBeenCalled();
            done();
          },
        });
      });
    });
  });
});
