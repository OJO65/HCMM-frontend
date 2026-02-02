import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
  HttpErrorResponse,
  HttpEventType
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  errorInterceptor,
  loggingInterceptor,
  retryInterceptor,
  EnhancedError
} from './error.interceptor';

describe('HTTP Error Interceptor Suite', () => {
  describe('errorInterceptor', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;
    let mockToastr: jasmine.SpyObj<ToastrService>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(() => {
      // Create spies for dependencies
      mockToastr = jasmine.createSpyObj('ToastrService', ['error', 'success', 'info', 'warning']);
      mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/current-page' });

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([errorInterceptor])),
          provideHttpClientTesting(),
          { provide: ToastrService, useValue: mockToastr },
          { provide: Router, useValue: mockRouter }
        ]
      });

      httpClient = TestBed.inject(HttpClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify(); // Ensure no outstanding requests
    });

    describe('Network Errors (Status 0)', () => {
      it('should handle network connection errors', (done) => {
        httpClient.get('/api/test').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(0);
            expect(error.message).toContain('Unable to connect to server');
            expect(mockToastr.error).toHaveBeenCalledWith(
              jasmine.stringContaining('Unable to connect'),
              'Error',
              jasmine.any(Object)
            );
            done();
          }
        });

        const req = httpMock.expectOne('/api/test');
        req.error(new ProgressEvent('network error'), { status: 0 });
      });
    });

    describe('Client Errors (4xx)', () => {
      it('should handle 400 Bad Request', (done) => {
        const errorMessage = 'Invalid parameters';
        
        httpClient.get('/api/test').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(400);
            expect(error.message).toBe(errorMessage);
            expect(mockToastr.error).toHaveBeenCalled();
            done();
          }
        });

        const req = httpMock.expectOne('/api/test');
        req.flush({ message: errorMessage }, { status: 400, statusText: 'Bad Request' });
      });

      it('should handle 401 Unauthorized and redirect to login', (done) => {
        // Spy on localStorage
        spyOn(localStorage, 'removeItem');
        
        httpClient.get('/api/protected').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(401);
            expect(mockToastr.error).toHaveBeenCalledWith(
              jasmine.any(String),
              'Authentication Error',
              jasmine.any(Object)
            );
            
            // Wait for setTimeout to execute
            setTimeout(() => {
              expect(mockRouter.navigate).toHaveBeenCalledWith(
                ['/login'],
                { queryParams: { returnUrl: '/current-page' } }
              );
              done();
            }, 150);
          }
        });

        const req = httpMock.expectOne('/api/protected');
        req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      });

      it('should NOT show toast for refresh token 401 errors', (done) => {
        httpClient.get('/auth/refresh').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(401);
            expect(mockToastr.error).not.toHaveBeenCalled();
            done();
          }
        });

        const req = httpMock.expectOne('/auth/refresh');
        req.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });
      });

      it('should handle 403 Forbidden and redirect to unauthorized page', (done) => {
        httpClient.get('/api/admin').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(403);
            expect(mockToastr.error).toHaveBeenCalled();
            
            setTimeout(() => {
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/unauthorized']);
              done();
            }, 150);
          }
        });

        const req = httpMock.expectOne('/api/admin');
        req.flush(
          { message: 'Access denied' },
          { status: 403, statusText: 'Forbidden' }
        );
      });

      it('should handle 404 Not Found', (done) => {
        httpClient.get('/api/nonexistent').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(404);
            expect(error.message).toContain('not found');
            done();
          }
        });

        const req = httpMock.expectOne('/api/nonexistent');
        req.flush(null, { status: 404, statusText: 'Not Found' });
      });

      it('should handle 409 Conflict', (done) => {
        httpClient.get('/api/resource').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(409);
            expect(error.message).toBe('Resource already exists');
            done();
          }
        });

        const req = httpMock.expectOne('/api/resource');
        req.flush(
          { message: 'Resource already exists' },
          { status: 409, statusText: 'Conflict' }
        );
      });

      it('should handle 422 Validation Error with field details', (done) => {
        const validationErrors = {
          email: ['Email is required', 'Email must be valid'],
          password: ['Password must be at least 8 characters']
        };

        httpClient.post('/api/register', {}).subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(422);
            // Should show multiple toasts for each field error
            expect(mockToastr.error).toHaveBeenCalledTimes(3);
            done();
          }
        });

        const req = httpMock.expectOne('/api/register');
        req.flush(
          { errors: validationErrors },
          { status: 422, statusText: 'Unprocessable Entity' }
        );
      });

      it('should handle 429 Too Many Requests', (done) => {
        httpClient.get('/api/rate-limited').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(429);
            expect(error.message).toContain('Too many requests');
            done();
          }
        });

        const req = httpMock.expectOne('/api/rate-limited');
        req.flush(null, { status: 429, statusText: 'Too Many Requests' });
      });
    });

    describe('Server Errors (5xx)', () => {
      it('should handle 500 Internal Server Error', (done) => {
        httpClient.get('/api/error').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(500);
            expect(error.message).toContain('Internal server error');
            done();
          }
        });

        const req = httpMock.expectOne('/api/error');
        req.flush(null, { status: 500, statusText: 'Internal Server Error' });
      });

      it('should handle 502 Bad Gateway', (done) => {
        httpClient.get('/api/gateway').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(502);
            expect(error.message).toContain('Bad gateway');
            done();
          }
        });

        const req = httpMock.expectOne('/api/gateway');
        req.flush(null, { status: 502, statusText: 'Bad Gateway' });
      });

      it('should handle 503 Service Unavailable', (done) => {
        httpClient.get('/api/unavailable').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(503);
            expect(error.message).toContain('Service unavailable');
            done();
          }
        });

        const req = httpMock.expectOne('/api/unavailable');
        req.flush(null, { status: 503, statusText: 'Service Unavailable' });
      });

      it('should handle 504 Gateway Timeout', (done) => {
        httpClient.get('/api/timeout').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(504);
            expect(error.message).toContain('Gateway timeout');
            done();
          }
        });

        const req = httpMock.expectOne('/api/timeout');
        req.flush(null, { status: 504, statusText: 'Gateway Timeout' });
      });
    });

    describe('Configuration Options', () => {
      it('should respect X-No-Toast header', (done) => {
        const headers = { 'X-No-Toast': 'true' };
        
        httpClient.get('/api/test', { headers }).subscribe({
          next: () => fail('Should have errored'),
          error: () => {
            expect(mockToastr.error).not.toHaveBeenCalled();
            done();
          }
        });

        const req = httpMock.expectOne('/api/test');
        req.flush(null, { status: 500, statusText: 'Error' });
      });
    });

    describe('Enhanced Error Object', () => {
      it('should create enhanced error with all required fields', (done) => {
        httpClient.post('/api/test', { data: 'test' }).subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(400);
            expect(error.message).toBeDefined();
            expect(error.timestamp).toBeDefined();
            expect(error.url).toBe('/api/test');
            expect(error.method).toBe('POST');
            done();
          }
        });

        const req = httpMock.expectOne('/api/test');
        req.flush(null, { status: 400, statusText: 'Bad Request' });
      });
    });
  });

  describe('loggingInterceptor', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;
    let consoleSpy: jasmine.Spy;

    beforeEach(() => {
      consoleSpy = spyOn(console, 'log');
      spyOn(console, 'error');

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([loggingInterceptor])),
          provideHttpClientTesting()
        ]
      });

      httpClient = TestBed.inject(HttpClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('should log successful requests', (done) => {
      httpClient.get('/api/test').subscribe(() => {
        expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringContaining('📤 GET /api/test'));
        expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringContaining('✅ GET /api/test'));
        done();
      });

      const req = httpMock.expectOne('/api/test');
      req.flush({ data: 'success' });
    });

    it('should log request body when present', (done) => {
      const body = { name: 'test', value: 123 };
      
      httpClient.post('/api/test', body).subscribe(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Request body:', body);
        done();
      });

      const req = httpMock.expectOne('/api/test');
      req.flush({ success: true });
    });

    it('should log failed requests with error details', (done) => {
      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          expect(console.error).toHaveBeenCalledWith(
            jasmine.stringContaining('❌ GET /api/test failed'),
            jasmine.any(HttpErrorResponse)
          );
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.error(new ProgressEvent('error'), { status: 500 });
    });
  });

  describe('retryInterceptor', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      spyOn(console, 'log');

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([retryInterceptor])),
          provideHttpClientTesting()
        ]
      });

      httpClient = TestBed.inject(HttpClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      // Don't verify - we handle cleanup manually in each test
    });

    it('should NOT retry POST requests', (done) => {
      let errorCaught = false;
      
      httpClient.post('/api/test', {}).subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          errorCaught = true;
          
          // Wait a bit to ensure no retry happens
          setTimeout(() => {
            const pendingReqs = httpMock.match('/api/test');
            expect(pendingReqs.length).toBe(0);
            expect(errorCaught).toBe(true);
            httpMock.verify();
            done();
          }, 100);
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.error(new ProgressEvent('error'), { status: 0 });
    });

    it('should NOT retry on 4xx errors', (done) => {
      let errorCaught = false;
      
      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          errorCaught = true;
          
          // Wait a bit to ensure no retry happens
          setTimeout(() => {
            const pendingReqs = httpMock.match('/api/test');
            expect(pendingReqs.length).toBe(0);
            expect(errorCaught).toBe(true);
            httpMock.verify();
            done();
          }, 100);
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });

    it('should respect X-Skip-Retry header', (done) => {
      const headers = { 'X-Skip-Retry': 'true' };
      let errorCaught = false;

      httpClient.get('/api/test', { headers }).subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          errorCaught = true;
          
          // Wait a bit to ensure no retry happens
          setTimeout(() => {
            const pendingReqs = httpMock.match('/api/test');
            expect(pendingReqs.length).toBe(0);
            expect(errorCaught).toBe(true);
            httpMock.verify();
            done();
          }, 100);
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.error(new ProgressEvent('error'), { status: 0 });
    });

    it('should retry GET requests on network errors', (done) => {
      let attempts = 0;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored after all retries'),
        error: () => {
          // All retries exhausted
          expect(attempts).toBe(4); // 1 initial + 3 retries
          httpMock.verify();
          done();
        }
      });

      // Use setInterval to check for requests and handle them
      const interval = setInterval(() => {
        const reqs = httpMock.match('/api/test');
        if (reqs.length > 0) {
          attempts++;
          reqs[0].error(new ProgressEvent('error'), { status: 0 });
          
          if (attempts >= 4) {
            clearInterval(interval);
          }
        }
      }, 100);
    }, 20000);

    it('should retry GET requests on 5xx errors', (done) => {
      let attempts = 0;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored after all retries'),
        error: () => {
          expect(attempts).toBe(4);
          httpMock.verify();
          done();
        }
      });

      const interval = setInterval(() => {
        const reqs = httpMock.match('/api/test');
        if (reqs.length > 0) {
          attempts++;
          reqs[0].flush(null, { status: 500, statusText: 'Error' });
          
          if (attempts >= 4) {
            clearInterval(interval);
          }
        }
      }, 100);
    }, 20000);

    it('should succeed after retry', (done) => {
      let attempts = 0;

      httpClient.get('/api/test').subscribe({
        next: (response) => {
          expect(response).toEqual({ data: 'success' });
          expect(attempts).toBe(2); // Failed once, succeeded on retry
          httpMock.verify();
          done();
        },
        error: () => fail('Should have succeeded')
      });

      const interval = setInterval(() => {
        const reqs = httpMock.match('/api/test');
        if (reqs.length > 0) {
          attempts++;
          
          if (attempts === 1) {
            // First attempt fails
            reqs[0].flush(null, { status: 500, statusText: 'Error' });
          } else {
            // Second attempt succeeds
            reqs[0].flush({ data: 'success' });
            clearInterval(interval);
          }
        }
      }, 100);
    }, 10000);
  });

  describe('Integration: All Interceptors Together', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;
    let mockToastr: jasmine.SpyObj<ToastrService>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(() => {
      mockToastr = jasmine.createSpyObj('ToastrService', ['error']);
      mockRouter = jasmine.createSpyObj('Router', ['navigate'], { url: '/test' });
      spyOn(console, 'log');
      spyOn(console, 'error');

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(
            withInterceptors([retryInterceptor, loggingInterceptor, errorInterceptor])
          ),
          provideHttpClientTesting(),
          { provide: ToastrService, useValue: mockToastr },
          { provide: Router, useValue: mockRouter }
        ]
      });

      httpClient = TestBed.inject(HttpClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('should apply all interceptors in correct order', (done) => {
      httpClient.get('/api/test').subscribe({
        next: () => {
          expect(console.log).toHaveBeenCalled(); // Logging
          done();
        }
      });

      const req = httpMock.expectOne('/api/test');
      req.flush({ success: true });
    });

    it('should retry, log, and handle errors together', (done) => {
      let attempts = 0;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored'),
        error: (error: EnhancedError) => {
          expect(attempts).toBe(4); // Retry interceptor
          expect(console.error).toHaveBeenCalled(); // Logging interceptor
          expect(mockToastr.error).toHaveBeenCalled(); // Error interceptor
          expect(error.status).toBe(500); // Enhanced error
          httpMock.verify();
          done();
        }
      });

      const interval = setInterval(() => {
        const reqs = httpMock.match('/api/test');
        if (reqs.length > 0) {
          attempts++;
          reqs[0].flush(null, { status: 500, statusText: 'Error' });
          
          if (attempts >= 4) {
            clearInterval(interval);
          }
        }
      }, 100);
    }, 20000);
  });
});