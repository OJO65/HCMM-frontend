import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { StorageService } from '../storage/storage.service';
import { 
  User, 
  UserRole, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  TokenPayload 
} from '../../../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let storageService: jasmine.SpyObj<StorageService>;
  let router: jasmine.SpyObj<Router>;

  const API_URL = 'https://localhost:8000/api';

  // Mock User Data
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+254712345678',
    avatar: 'https://example.com/avatar.jpg',
    isVerified: true,
    isActive: true,
    role: UserRole.CUSTOMER,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    customerProfile: {
      defaultAddress: {
        address: '123 Main St, Nairobi',
        latitude: -1.286389,
        longitude: 36.817223,
        label: 'Home'
      },
      savedAddresses: [],
      totalOrders: 5
    }
  };

  // Mock Auth Response
  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTcwNDEwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.test',
    refreshToken: 'refresh-token-123',
    expiresIn: 3600
  };

  // Mock Login Request
  const mockLoginRequest: LoginRequest = {
    email: 'test@example.com',
    password: 'Password123!'
  };

  // Mock Register Request
  const mockRegisterRequest: RegisterRequest = {
    email: 'newuser@example.com',
    password: 'Password123!',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+254712345679',
    role: UserRole.CUSTOMER
  };

  beforeEach(() => {
    // Create spies for StorageService
    const storageSpy = jasmine.createSpyObj('StorageService', [
      'getAccessToken',
      'setAccessToken',
      'getRefreshToken',
      'setRefreshToken',
      'getUser',
      'setUser',
      'clear'
    ]);

    // Create spy for Router
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: StorageService, useValue: storageSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    storageService = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Default spy return values
    storageService.getAccessToken.and.returnValue(null);
    storageService.getRefreshToken.and.returnValue(null);
    storageService.getUser.and.returnValue(null);
  });

  afterEach(() => {
    // Verify no outstanding HTTP requests
    httpMock.verify();
  });

  // ========================================
  // SERVICE CREATION & INITIALIZATION
  // ========================================
  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null user when no stored data', () => {
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should load stored user on initialization if token is valid', () => {
      // This test requires re-initialization with stored data
      const validToken = mockAuthResponse.accessToken;
      const newStorageSpy = jasmine.createSpyObj('StorageService', [
        'getAccessToken',
        'getRefreshToken',
        'getUser',
        'setUser',
        'clear'
      ]);
      
      newStorageSpy.getAccessToken.and.returnValue(validToken);
      newStorageSpy.getUser.and.returnValue(mockUser);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: StorageService, useValue: newStorageSpy },
          { provide: Router, useValue: router }
        ]
      });

      const newService = TestBed.inject(AuthService);
      
      // Should have loaded the user
      expect(newService.currentUser()).toEqual(mockUser);
      expect(newService.isAuthenticated()).toBe(true);
    });
  });

  // ========================================
  // LOGIN TESTS
  // ========================================
  describe('login()', () => {
    it('should successfully login and set user state', (done) => {
      service.login(mockLoginRequest).subscribe({
        next: (response) => {
          expect(response).toEqual(mockAuthResponse);
          expect(service.currentUser()).toEqual(mockUser);
          expect(service.isAuthenticated()).toBe(true);
          done();
        },
        error: (error) => {
          fail('Should not error');
          done();
        }
      });

      // Verify HTTP request
      const req = httpMock.expectOne(`${API_URL}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLoginRequest);
      
      // Respond with mock data
      req.flush(mockAuthResponse);

      // Check loading state after flush (finalize has completed)
      expect(service.isLoading()).toBe(false);

      // Verify storage calls
      expect(storageService.setAccessToken).toHaveBeenCalledWith(mockAuthResponse.accessToken);
      expect(storageService.setRefreshToken).toHaveBeenCalledWith(mockAuthResponse.refreshToken);
      expect(storageService.setUser).toHaveBeenCalledWith(mockAuthResponse.user);
    });

    it('should set loading to true during login', () => {
      expect(service.isLoading()).toBe(false);

      service.login(mockLoginRequest).subscribe();
      
      // Loading should be true immediately
      expect(service.isLoading()).toBe(true);

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(mockAuthResponse);

      // Loading should be false after response
      expect(service.isLoading()).toBe(false);
    });

    it('should navigate to customer dashboard after customer login', (done) => {
      service.login(mockLoginRequest).subscribe({
        next: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/customer/dashboard']);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(mockAuthResponse);
    });

    it('should navigate to cook dashboard after cook login', (done) => {
      const cookAuthResponse = {
        ...mockAuthResponse,
        user: { ...mockUser, role: UserRole.COOK }
      };

      service.login(mockLoginRequest).subscribe({
        next: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/cook/dashboard']);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(cookAuthResponse);
    });

    it('should navigate to admin dashboard after admin login', (done) => {
      const adminAuthResponse = {
        ...mockAuthResponse,
        user: { ...mockUser, role: UserRole.ADMIN }
      };

      service.login(mockLoginRequest).subscribe({
        next: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(adminAuthResponse);
    });

    it('should navigate to delivery dashboard after delivery guy login', (done) => {
      const deliveryAuthResponse = {
        ...mockAuthResponse,
        user: { ...mockUser, role: UserRole.DELIVERY_GUY }
      };

      service.login(mockLoginRequest).subscribe({
        next: () => {
          expect(router.navigate).toHaveBeenCalledWith(['/delivery/dashboard']);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(deliveryAuthResponse);
    });

    it('should handle login error with invalid credentials', (done) => {
      const errorResponse = {
        message: 'Invalid credentials'
      };

      service.login(mockLoginRequest).subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (error) => {
          expect(error.message).toContain('Invalid credentials');
          expect(service.currentUser()).toBeNull();
          expect(service.isAuthenticated()).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
      
      // Check loading state after the request completes (finalize has run)
      expect(service.isLoading()).toBe(false);
    });

    it('should handle network errors during login', (done) => {
      service.login(mockLoginRequest).subscribe({
        next: () => {
          fail('Should have errored');
          done();
        },
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.error(new ErrorEvent('Network error', {
        message: 'Failed to connect'
      }));
      
      // Check loading state after the request completes (finalize has run)
      expect(service.isLoading()).toBe(false);
    });

    it('should update currentUser$ observable on login', (done) => {
      let emissionCount = 0;
      
      service.currentUser$.subscribe(user => {
        emissionCount++;
        if (emissionCount === 2) { // First emission is null, second is user
          expect(user).toEqual(mockUser);
          done();
        }
      });

      service.login(mockLoginRequest).subscribe();

      const req = httpMock.expectOne(`${API_URL}/login`);
      req.flush(mockAuthResponse);
    });
  });

  // ========================================
  // REGISTER TESTS
  // ========================================
  describe('register()', () => {
    it('should successfully register a new user', (done) => {
      service.register(mockRegisterRequest).subscribe({
        next: (response) => {
          expect(response).toEqual(mockAuthResponse);
          expect(service.currentUser()).toEqual(mockUser);
          expect(service.isAuthenticated()).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockRegisterRequest);
      req.flush(mockAuthResponse);
    });

    it('should set loading state during registration', () => {
      expect(service.isLoading()).toBe(false);

      service.register(mockRegisterRequest).subscribe();
      expect(service.isLoading()).toBe(true);

      const req = httpMock.expectOne(`${API_URL}/register`);
      req.flush(mockAuthResponse);
      expect(service.isLoading()).toBe(false);
    });

    it('should handle registration error with duplicate email', (done) => {
      const errorResponse = {
        message: 'Email already exists'
      };

      service.register(mockRegisterRequest).subscribe({
        error: (error) => {
          expect(error.message).toContain('Email already exists');
          expect(service.currentUser()).toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/register`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('should navigate to dashboard after successful registration', (done) => {
      service.register(mockRegisterRequest).subscribe({
        next: () => {
          expect(router.navigate).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/register`);
      req.flush(mockAuthResponse);
    });
  });

  // ========================================
  // LOGOUT TESTS
  // ========================================
  describe('logout()', () => {
    beforeEach(() => {
      // Set up authenticated state
      storageService.getRefreshToken.and.returnValue('refresh-token-123');
      service['setCurrentUser'](mockUser);
    });

    it('should successfully logout and clear auth data', () => {
      service.logout();

      // Verify logout API call
      const req = httpMock.expectOne(`${API_URL}/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-token-123' });
      req.flush({});

      // Verify state cleared (happens synchronously now)
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(storageService.clear).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should clear state even if logout API call fails', () => {
      service.logout();

      const req = httpMock.expectOne(`${API_URL}/logout`);
      req.error(new ErrorEvent('Network error'));

      // State should be cleared immediately regardless of API result
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(storageService.clear).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should not make API call if no refresh token exists', () => {
      storageService.getRefreshToken.and.returnValue(null);
      
      service.logout();

      // Should not make HTTP request
      httpMock.expectNone(`${API_URL}/logout`);

      // Should still clear state immediately
      expect(storageService.clear).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  // ========================================
  // TOKEN REFRESH TESTS
  // ========================================
  describe('refreshToken()', () => {
    it('should successfully refresh access token', (done) => {
      storageService.getRefreshToken.and.returnValue('refresh-token-123');

      const refreshResponse: AuthResponse = {
        ...mockAuthResponse,
        accessToken: 'new-access-token'
      };

      service.refreshToken().subscribe({
        next: (response) => {
          expect(response).toEqual(refreshResponse);
          expect(storageService.setAccessToken).toHaveBeenCalledWith('new-access-token');
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/refresh-token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-token-123' });
      req.flush(refreshResponse);
    });

    it('should update refresh token if new one is provided', (done) => {
      storageService.getRefreshToken.and.returnValue('old-refresh-token');

      const refreshResponse: AuthResponse = {
        ...mockAuthResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      service.refreshToken().subscribe({
        next: () => {
          expect(storageService.setAccessToken).toHaveBeenCalledWith('new-access-token');
          expect(storageService.setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/refresh-token`);
      req.flush(refreshResponse);
    });

    it('should throw error if no refresh token exists', (done) => {
      storageService.getRefreshToken.and.returnValue(null);

      service.refreshToken().subscribe({
        error: (error) => {
          expect(error.message).toBe('No refresh token available');
          done();
        }
      });
    });

    it('should logout on refresh token error', (done) => {
      storageService.getRefreshToken.and.returnValue('refresh-token-123');
      spyOn(service, 'logout');

      service.refreshToken().subscribe({
        error: () => {
          expect(service.logout).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/refresh-token`);
      req.flush({ message: 'Invalid refresh token' }, { 
        status: 401, 
        statusText: 'Unauthorized' 
      });
    });
  });

  // ========================================
  // PROFILE TESTS
  // ========================================
  describe('getCurrentUserProfile()', () => {
    it('should fetch current user profile', (done) => {
      service.getCurrentUserProfile().subscribe({
        next: (user) => {
          expect(user).toEqual(mockUser);
          expect(service.currentUser()).toEqual(mockUser);
          expect(storageService.setUser).toHaveBeenCalledWith(mockUser);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/profile`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });

    it('should handle profile fetch error', (done) => {
      service.getCurrentUserProfile().subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/profile`);
      req.flush({ message: 'Unauthorized' }, { 
        status: 401, 
        statusText: 'Unauthorized' 
      });
    });
  });

  describe('updateProfile()', () => {
    it('should update user profile', (done) => {
      const updates = {
        firstName: 'Jane',
        lastName: 'Updated'
      };

      const updatedUser = { ...mockUser, ...updates };

      service.updateProfile(updates).subscribe({
        next: (user) => {
          expect(user).toEqual(updatedUser);
          expect(service.currentUser()).toEqual(updatedUser);
          expect(storageService.setUser).toHaveBeenCalledWith(updatedUser);
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/profile`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updates);
      req.flush(updatedUser);
    });
  });

  // ========================================
  // PASSWORD RESET TESTS
  // ========================================
  describe('forgotPassword()', () => {
    it('should send password reset email', (done) => {
      const email = 'test@example.com';

      service.forgotPassword(email).subscribe({
        next: (response) => {
          expect(response.message).toBe('Password reset email sent');
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email });
      req.flush({ message: 'Password reset email sent' });
    });

    it('should handle invalid email error', (done) => {
      service.forgotPassword('invalid@example.com').subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/forgot-password`);
      req.flush({ message: 'Email not found' }, { 
        status: 404, 
        statusText: 'Not Found' 
      });
    });
  });

  describe('resetPassword()', () => {
    it('should successfully reset password', (done) => {
      const token = 'reset-token-123';
      const newPassword = 'NewPassword123!';

      service.resetPassword(token, newPassword).subscribe({
        next: (response) => {
          expect(response.message).toBe('Password reset successful');
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token, newPassword });
      req.flush({ message: 'Password reset successful' });
    });

    it('should handle invalid reset token', (done) => {
      service.resetPassword('invalid-token', 'NewPassword123!').subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/reset-password`);
      req.flush({ message: 'Invalid or expired token' }, { 
        status: 400, 
        statusText: 'Bad Request' 
      });
    });
  });

  // ========================================
  // EMAIL VERIFICATION TESTS
  // ========================================
  describe('verifyEmail()', () => {
    it('should successfully verify email', (done) => {
      const token = 'verification-token-123';

      service.verifyEmail(token).subscribe({
        next: (response) => {
          expect(response.message).toBe('Email verified successfully');
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/verify-email`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token });
      req.flush({ message: 'Email verified successfully' });
    });

    it('should handle invalid verification token', (done) => {
      service.verifyEmail('invalid-token').subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_URL}/verify-email`);
      req.flush({ message: 'Invalid token' }, { 
        status: 400, 
        statusText: 'Bad Request' 
      });
    });
  });

  // ========================================
  // ROLE CHECKING TESTS
  // ========================================
  describe('Role Checking Methods', () => {
    beforeEach(() => {
      service['setCurrentUser'](mockUser); // mockUser has CUSTOMER role
    });

    it('hasRole() should return true for user role', () => {
      expect(service.hasRole(UserRole.CUSTOMER)).toBe(true);
      expect(service.hasRole(UserRole.COOK)).toBe(false);
      expect(service.hasRole(UserRole.ADMIN)).toBe(false);
      expect(service.hasRole(UserRole.DELIVERY_GUY)).toBe(false);
    });

    it('hasAnyRole() should return true if user has one of the roles', () => {
      expect(service.hasAnyRole([UserRole.CUSTOMER, UserRole.ADMIN])).toBe(true);
      expect(service.hasAnyRole([UserRole.COOK, UserRole.DELIVERY_GUY])).toBe(false);
    });

    it('getUserRole() should return current user role', () => {
      expect(service.getUserRole()).toBe(UserRole.CUSTOMER);
    });

    it('should return false/null when no user is logged in', () => {
      service['setCurrentUser'](null);

      expect(service.hasRole(UserRole.CUSTOMER)).toBe(false);
      expect(service.hasAnyRole([UserRole.CUSTOMER])).toBe(false);
      expect(service.getUserRole()).toBeNull();
    });
  });

  // ========================================
  // TOKEN MANAGEMENT TESTS
  // ========================================
  describe('Token Management', () => {
    it('getAccessToken() should return token from storage', () => {
      storageService.getAccessToken.and.returnValue('test-access-token');
      expect(service.getAccessToken()).toBe('test-access-token');
    });

    it('getAccessToken() should return null when no token exists', () => {
      storageService.getAccessToken.and.returnValue(null);
      expect(service.getAccessToken()).toBeNull();
    });
  });

  // ========================================
  // TOKEN VALIDATION TESTS
  // ========================================
  describe('Token Validation', () => {
    it('should validate token correctly', () => {
      const validToken = mockAuthResponse.accessToken;
      const result = service['isTokenValid'](validToken);
      expect(result).toBe(true);
    });

    it('should invalidate expired token', () => {
      // Create an expired token (exp in the past)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTcwNDEwMDAwMCwiZXhwIjoxfQ.test';
      
      const result = service['isTokenValid'](expiredToken);
      expect(result).toBe(false);
    });

    it('should handle malformed token', () => {
      const malformedToken = 'invalid.token.format';
      const result = service['isTokenValid'](malformedToken);
      expect(result).toBe(false);
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================
  describe('Integration Scenarios', () => {
    it('should complete full login-logout flow', (done) => {
      // Start: Not authenticated
      expect(service.isAuthenticated()).toBe(false);

      // Login
      service.login(mockLoginRequest).subscribe({
        next: () => {
          // Should be authenticated
          expect(service.isAuthenticated()).toBe(true);
          expect(service.currentUser()).toEqual(mockUser);

          // Set up storage to return refresh token for logout
          storageService.getRefreshToken.and.returnValue(mockAuthResponse.refreshToken);

          // Logout (synchronous state clearing)
          service.logout();

          // State should be cleared immediately
          expect(service.isAuthenticated()).toBe(false);
          expect(service.currentUser()).toBeNull();

          // Wait for HTTP request to be initiated (microtask)
          setTimeout(() => {
            // Handle the logout request (fire and forget)
            const logoutReq = httpMock.expectOne(`${API_URL}/logout`);
            logoutReq.flush({});
            done();
          }, 0);
        }
      });

      const loginReq = httpMock.expectOne(`${API_URL}/login`);
      loginReq.flush(mockAuthResponse);
    });

    it('should handle register -> profile update flow', (done) => {
      service.register(mockRegisterRequest).subscribe({
        next: () => {
          expect(service.isAuthenticated()).toBe(true);

          // Update profile
          service.updateProfile({ firstName: 'UpdatedName' }).subscribe({
            next: (updatedUser) => {
              expect(updatedUser.firstName).toBe('UpdatedName');
              expect(service.currentUser()?.firstName).toBe('UpdatedName');
              done();
            }
          });

          const updateReq = httpMock.expectOne(`${API_URL}/profile`);
          updateReq.flush({ ...mockUser, firstName: 'UpdatedName' });
        }
      });

      const registerReq = httpMock.expectOne(`${API_URL}/register`);
      registerReq.flush(mockAuthResponse);
    });
  });
});