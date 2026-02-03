import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  errorInterceptor,
  loggingInterceptor,
  retryInterceptor,
  EnhancedError,
} from './error.interceptor';

describe('HTTP Error Interceptor Suite', () => {
  describe('errorInterceptor', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;
    let mockToastr: jasmine.SpyObj<ToastrService>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(() => {
      mockToastr = jasmine.createSpyObj('ToastrService', [
        'error',
        'success',
        'info',
        'warning',
      ]);
      mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
        url: '/current-page',
      });

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([errorInterceptor])),
          provideHttpClientTesting(),
          { provide: ToastrService, useValue: mockToastr },
          { provide: Router, useValue: mockRouter },
        ],
      });

      httpClient = TestBed.inject(HttpClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
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
              jasmine.any(Object),
            );
            done();
          },
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
          },
        });

        const req = httpMock.expectOne('/api/test');
        req.flush(
          { message: errorMessage },
          { status: 400, statusText: 'Bad Request' },
        );
      });

      it('should handle 401 Unauthorized and redirect to login', (done) => {
        spyOn(localStorage, 'removeItem');

        httpClient.get('/api/protected').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(401);
            expect(mockToastr.error).toHaveBeenCalledWith(
              jasmine.any(String),
              'Authentication Error',
              jasmine.any(Object),
            );

            setTimeout(() => {
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
                queryParams: { returnUrl: '/current-page' },
              });
              done();
            }, 150);
          },
        });

        const req = httpMock.expectOne('/api/protected');
        req.flush(
          { message: 'Unauthorized' },
          { status: 401, statusText: 'Unauthorized' },
        );
      });

      it('should NOT show toast for refresh token 401 errors', (done) => {
        httpClient.get('/auth/refresh').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(401);
            expect(mockToastr.error).not.toHaveBeenCalled();
            done();
          },
        });

        const req = httpMock.expectOne('/auth/refresh');
        req.flush(
          { message: 'Token expired' },
          { status: 401, statusText: 'Unauthorized' },
        );
      });

      it('should handle 403 Forbidden and redirect to unauthorized page', (done) => {
        httpClient.get('/api/admin').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(403);
            expect(mockToastr.error).toHaveBeenCalled();

            setTimeout(() => {
              expect(mockRouter.navigate).toHaveBeenCalledWith([
                '/unauthorized',
              ]);
              done();
            }, 150);
          },
        });

        const req = httpMock.expectOne('/api/admin');
        req.flush(
          { message: 'Access denied' },
          { status: 403, statusText: 'Forbidden' },
        );
      });

      it('should handle 404 Not Found', (done) => {
        httpClient.get('/api/nonexistent').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(404);
            expect(error.message).toContain('not found');
            done();
          },
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
          },
        });

        const req = httpMock.expectOne('/api/resource');
        req.flush(
          { message: 'Resource already exists' },
          { status: 409, statusText: 'Conflict' },
        );
      });

      it('should handle 422 Validation Error with field details', (done) => {
        const validationErrors = {
          email: ['Email is required', 'Email must be valid'],
          password: ['Password must be at least 8 characters'],
        };

        httpClient.post('/api/register', {}).subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(422);
            expect(mockToastr.error).toHaveBeenCalledTimes(3);
            done();
          },
        });

        const req = httpMock.expectOne('/api/register');
        req.flush(
          { errors: validationErrors },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      });

      it('should handle 429 Too Many Requests', (done) => {
        httpClient.get('/api/rate-limited').subscribe({
          next: () => fail('Should have errored'),
          error: (error: EnhancedError) => {
            expect(error.status).toBe(429);
            expect(error.message).toContain('Too many requests');
            done();
          },
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
          },
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
          },
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
          },
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
          },
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
          },
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
          },
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
          provideHttpClientTesting(),
        ],
      });

      httpClient = TestBed.inject(HttpClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('should log successful requests', (done) => {
      httpClient.get('/api/test').subscribe(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          jasmine.stringContaining('📤 GET /api/test'),
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          jasmine.stringContaining('✅ GET /api/test'),
        );
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
            jasmine.any(HttpErrorResponse),
          );
          done();
        },
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
          provideHttpClientTesting(),
        ],
      });

      httpClient = TestBed.inject(HttpClient);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('should NOT retry POST requests', fakeAsync(() => {
      let requestCount = 0;
      let errorCaught = false;

      httpClient.post('/api/test', {}).subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          errorCaught = true;
        },
      });

      const req = httpMock.expectOne('/api/test');
      requestCount++;
      req.error(new ProgressEvent('error'), { status: 0 });

      flush(); // Complete all async operations

      expect(requestCount).toBe(1);
      expect(errorCaught).toBe(true);
    }));

    it('should NOT retry on 4xx errors', fakeAsync(() => {
      let requestCount = 0;
      let errorCaught = false;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          errorCaught = true;
        },
      });

      const req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 404, statusText: 'Not Found' });

      flush();

      expect(requestCount).toBe(1);
      expect(errorCaught).toBe(true);
    }));

    it('should respect X-Skip-Retry header', fakeAsync(() => {
      const headers = { 'X-Skip-Retry': 'true' };
      let requestCount = 0;
      let errorCaught = false;

      httpClient.get('/api/test', { headers }).subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          errorCaught = true;
        },
      });

      const req = httpMock.expectOne('/api/test');
      requestCount++;
      req.error(new ProgressEvent('error'), { status: 0 });

      flush();

      expect(requestCount).toBe(1);
      expect(errorCaught).toBe(true);
    }));

    

    it('should retry GET requests on network errors', fakeAsync(() => {
      let requestCount = 0;
      let errorCaught = false;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          errorCaught = true;
        },
      });

      // Initial request
      let req = httpMock.expectOne('/api/test');
      requestCount++;
      req.error(new ProgressEvent('error'), { status: 0 });

      // Retry 1
      tick(1000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.error(new ProgressEvent('error'), { status: 0 });

      // Retry 2
      tick(2000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.error(new ProgressEvent('error'), { status: 0 });

      // Retry 3
      tick(4000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.error(new ProgressEvent('error'), { status: 0 });

      flush(); // Complete all pending operations

      expect(requestCount).toBe(4);
      expect(errorCaught).toBe(true);
    }));

    it('should retry GET requests on 5xx errors', fakeAsync(() => {
      let requestCount = 0;
      let errorCaught = false;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          errorCaught = true;
        },
      });

      let req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Error' });

      tick(1000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Error' });

      tick(2000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Error' });

      tick(4000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Error' });

      flush();

      expect(requestCount).toBe(4);
      expect(errorCaught).toBe(true);
    }));

    it('should succeed after retry', fakeAsync(() => {
      let requestCount = 0;
      let receivedResponse: any;

      httpClient.get('/api/test').subscribe({
        next: (response) => {
          receivedResponse = response;
        },
        error: () => fail('Should have succeeded'),
      });

      let req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Error' });

      tick(1000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush({ data: 'success' });

      flush();

      expect(requestCount).toBe(2);
      expect(receivedResponse).toEqual({ data: 'success' });
    }));
  });

  describe('Integration: All Interceptors Together', () => {
    let httpClient: HttpClient;
    let httpMock: HttpTestingController;
    let mockToastr: jasmine.SpyObj<ToastrService>;
    let mockRouter: jasmine.SpyObj<Router>;

    beforeEach(() => {
      mockToastr = jasmine.createSpyObj('ToastrService', ['error']);
      mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
        url: '/test',
      });
      spyOn(console, 'log');
      spyOn(console, 'error');

      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(
            withInterceptors([
              retryInterceptor,
              loggingInterceptor,
              errorInterceptor,
            ]),
          ),
          provideHttpClientTesting(),
          { provide: ToastrService, useValue: mockToastr },
          { provide: Router, useValue: mockRouter },
        ],
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
          expect(console.log).toHaveBeenCalled();
          done();
        },
      });

      const req = httpMock.expectOne('/api/test');
      req.flush({ success: true });
    });

    it('should retry GET requests on network error followed by 5xx errors', fakeAsync(() => {
      let requestCount = 0;
      let errorCaught = false;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored'),
        error: () => {
          errorCaught = true;
        },
      });

      // 1st attempt: network error
      let req = httpMock.expectOne('/api/test');
      requestCount++;
      req.error(new ProgressEvent('network error'), { status: 0 });

      // Retry 1: 500
      tick(1000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });

      // Retry 2: 502
      tick(2000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 502, statusText: 'Bad Gateway' });

      // Retry 3: 503
      tick(4000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 503, statusText: 'Service Unavailable' });

      flush();

      expect(requestCount).toBe(4); // initial + 3 retries
      expect(errorCaught).toBe(true);
    }));

    it('should stop retrying after maximum attempts', fakeAsync(() => {
      const maxRetries = 3;
      let requestCount = 0;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored'),
        error: () => {},
      });

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const req = httpMock.expectOne('/api/test');
        requestCount++;
        req.error(new ProgressEvent('network error'), { status: 0 });
        tick(1000 * Math.pow(2, attempt)); // exponential backoff
      }

      flush();
      expect(requestCount).toBe(maxRetries + 1);
    }));

    it('should not retry PUT/PATCH/DELETE requests even on network errors', fakeAsync(() => {
      const methods = ['PUT', 'PATCH', 'DELETE'];

      methods.forEach((method) => {
        let errorCaught = false;

        httpClient.request(method, '/api/test').subscribe({
          next: () => fail('Should have errored'),
          error: () => {
            errorCaught = true;
          },
        });

        const req = httpMock.expectOne('/api/test');
        req.error(new ProgressEvent('network error'), { status: 0 });

        flush();
        expect(errorCaught).toBe(true);
      });
    }));

    it('should respect both X-No-Toast and X-Skip-Retry headers together', fakeAsync(() => {
      let errorCaught = false;

      httpClient
        .get('/api/test', {
          headers: { 'X-No-Toast': 'true', 'X-Skip-Retry': 'true' },
        })
        .subscribe({
          next: () => fail('Should have errored'),
          error: () => {
            errorCaught = true;
          },
        });

      const req = httpMock.expectOne('/api/test');
      req.error(new ProgressEvent('network error'), { status: 0 });

      flush();
      expect(errorCaught).toBe(true);
      expect(mockToastr.error).not.toHaveBeenCalled();
    }));

    it('should retry, log, and handle errors together', fakeAsync(() => {
      let requestCount = 0;
      let errorCaught = false;
      let finalError: EnhancedError | null = null;

      httpClient.get('/api/test').subscribe({
        next: () => fail('Should have errored'),
        error: (error: EnhancedError) => {
          errorCaught = true;
          finalError = error;
        },
      });

      let req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Error' });

      tick(1000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Error' });

      tick(2000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Error' });

      tick(4000);
      req = httpMock.expectOne('/api/test');
      requestCount++;
      req.flush(null, { status: 500, statusText: 'Error' });

      flush();

      expect(requestCount).toBe(4);
      expect(console.error).toHaveBeenCalled();
      expect(mockToastr.error).toHaveBeenCalled();
      expect(finalError!.status).toBe(500);
      expect(errorCaught).toBe(true);
    }));
  });
});
