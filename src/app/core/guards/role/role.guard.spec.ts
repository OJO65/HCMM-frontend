import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import {
  roleGuard,
  customerGuard,
  cookGuard,
  deliveryGuard,
  adminGuard,
} from './role.guard';
import { AuthService } from '../../services/auth/auth.service';
import { UserRole } from '../../../models/user.model';

describe('Role Guards Test Suite', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let mockUrlTree: UrlTree;

  beforeEach(() => {
    // Create spy objects with all necessary methods
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'hasAnyRole',
      'hasRole',
    ]);
    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);
    
    // Create mock URL tree
    mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    // Configure TestBed with providers
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    // Setup mock route and state
    mockRoute = {
      data: {},
    } as ActivatedRouteSnapshot;

    mockState = {
      url: '/test-url',
    } as RouterStateSnapshot;
  });

  afterEach(() => {
    // Reset all spies after each test
    mockAuthService.isAuthenticated.calls.reset();
    mockAuthService.hasAnyRole.calls.reset();
    mockAuthService.hasRole.calls.reset();
    mockRouter.createUrlTree.calls.reset();
  });

  describe('roleGuard', () => {
    describe('Authentication checks', () => {
      it('should redirect to login when user is not authenticated', () => {
        mockAuthService.isAuthenticated.and.returnValue(false);

        const result = TestBed.runInInjectionContext(() =>
          roleGuard(mockRoute, mockState)
        );

        expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
        expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: '/test-url' },
        });
        expect(result).toBe(mockUrlTree);
      });

      it('should preserve the return URL in query params when redirecting to login', () => {
        mockAuthService.isAuthenticated.and.returnValue(false);
        mockState.url = '/protected/resource';

        TestBed.runInInjectionContext(() => roleGuard(mockRoute, mockState));

        expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
          queryParams: { returnUrl: '/protected/resource' },
        });
      });
    });

    describe('Role-based authorization', () => {
      beforeEach(() => {
        mockAuthService.isAuthenticated.and.returnValue(true);
      });

      it('should allow access when no roles are required', () => {
        mockRoute.data = {};

        const result = TestBed.runInInjectionContext(() =>
          roleGuard(mockRoute, mockState)
        );

        expect(result).toBe(true);
        expect(mockAuthService.hasAnyRole).not.toHaveBeenCalled();
      });

      it('should allow access when roles array is empty', () => {
        mockRoute.data = { roles: [] };

        const result = TestBed.runInInjectionContext(() =>
          roleGuard(mockRoute, mockState)
        );

        expect(result).toBe(true);
        expect(mockAuthService.hasAnyRole).not.toHaveBeenCalled();
      });

      it('should allow access when user has one of the required roles', () => {
        mockRoute.data = { roles: [UserRole.ADMIN, UserRole.COOK] };
        mockAuthService.hasAnyRole.and.returnValue(true);

        const result = TestBed.runInInjectionContext(() =>
          roleGuard(mockRoute, mockState)
        );

        expect(mockAuthService.hasAnyRole).toHaveBeenCalledWith([
          UserRole.ADMIN,
          UserRole.COOK,
        ]);
        expect(result).toBe(true);
      });

      it('should redirect to unauthorized when user lacks required roles', () => {
        mockRoute.data = { roles: [UserRole.ADMIN] };
        mockAuthService.hasAnyRole.and.returnValue(false);

        const result = TestBed.runInInjectionContext(() =>
          roleGuard(mockRoute, mockState)
        );

        expect(mockAuthService.hasAnyRole).toHaveBeenCalledWith([UserRole.ADMIN]);
        expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
        expect(result).toBe(mockUrlTree);
      });

      it('should handle multiple required roles correctly', () => {
        const requiredRoles = [
          UserRole.ADMIN,
          UserRole.COOK,
          UserRole.DELIVERY_GUY,
        ];
        mockRoute.data = { roles: requiredRoles };
        mockAuthService.hasAnyRole.and.returnValue(true);

        const result = TestBed.runInInjectionContext(() =>
          roleGuard(mockRoute, mockState)
        );

        expect(mockAuthService.hasAnyRole).toHaveBeenCalledWith(requiredRoles);
        expect(result).toBe(true);
      });
    });

    describe('Edge cases', () => {
      beforeEach(() => {
        mockAuthService.isAuthenticated.and.returnValue(true);
      });

      it('should handle undefined roles data', () => {
        mockRoute.data = { roles: undefined };

        const result = TestBed.runInInjectionContext(() =>
          roleGuard(mockRoute, mockState)
        );

        expect(result).toBe(true);
      });

      it('should handle null roles data', () => {
        mockRoute.data = { roles: null };

        const result = TestBed.runInInjectionContext(() =>
          roleGuard(mockRoute, mockState)
        );

        expect(result).toBe(true);
      });
    });
  });

  describe('customerGuard', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        customerGuard(mockRoute, mockState)
      );

      expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/test-url' },
      });
      expect(result).toBe(mockUrlTree);
    });

    it('should allow access when user has CUSTOMER role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        customerGuard(mockRoute, mockState)
      );

      expect(mockAuthService.hasRole).toHaveBeenCalledWith(UserRole.CUSTOMER);
      expect(result).toBe(true);
    });

    it('should redirect to unauthorized when user lacks CUSTOMER role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        customerGuard(mockRoute, mockState)
      );

      expect(mockAuthService.hasRole).toHaveBeenCalledWith(UserRole.CUSTOMER);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
      expect(result).toBe(mockUrlTree);
    });
  });

  describe('cookGuard', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        cookGuard(mockRoute, mockState)
      );

      expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/test-url' },
      });
      expect(result).toBe(mockUrlTree);
    });

    it('should allow access when user has COOK role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        cookGuard(mockRoute, mockState)
      );

      expect(mockAuthService.hasRole).toHaveBeenCalledWith(UserRole.COOK);
      expect(result).toBe(true);
    });

    it('should redirect to unauthorized when user lacks COOK role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        cookGuard(mockRoute, mockState)
      );

      expect(mockAuthService.hasRole).toHaveBeenCalledWith(UserRole.COOK);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
      expect(result).toBe(mockUrlTree);
    });
  });

  describe('deliveryGuard', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        deliveryGuard(mockRoute, mockState)
      );

      expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/test-url' },
      });
      expect(result).toBe(mockUrlTree);
    });

    it('should allow access when user has DELIVERY_GUY role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        deliveryGuard(mockRoute, mockState)
      );

      expect(mockAuthService.hasRole).toHaveBeenCalledWith(UserRole.DELIVERY_GUY);
      expect(result).toBe(true);
    });

    it('should redirect to unauthorized when user lacks DELIVERY_GUY role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        deliveryGuard(mockRoute, mockState)
      );

      expect(mockAuthService.hasRole).toHaveBeenCalledWith(UserRole.DELIVERY_GUY);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
      expect(result).toBe(mockUrlTree);
    });
  });

  describe('adminGuard', () => {
    it('should redirect to login when user is not authenticated', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        adminGuard(mockRoute, mockState)
      );

      expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/test-url' },
      });
      expect(result).toBe(mockUrlTree);
    });

    it('should allow access when user has ADMIN role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        adminGuard(mockRoute, mockState)
      );

      expect(mockAuthService.hasRole).toHaveBeenCalledWith(UserRole.ADMIN);
      expect(result).toBe(true);
    });

    it('should redirect to unauthorized when user lacks ADMIN role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        adminGuard(mockRoute, mockState)
      );

      expect(mockAuthService.hasRole).toHaveBeenCalledWith(UserRole.ADMIN);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
      expect(result).toBe(mockUrlTree);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle rapid consecutive guard calls correctly', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.hasRole.and.returnValue(true);

      TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));
      TestBed.runInInjectionContext(() => cookGuard(mockRoute, mockState));
      TestBed.runInInjectionContext(() => customerGuard(mockRoute, mockState));

      expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(3);
      expect(mockAuthService.hasRole).toHaveBeenCalledTimes(3);
    });

    it('should maintain correct state URL across different guards', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockState.url = '/admin/dashboard';

      TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/admin/dashboard' },
      });
    });
  });
});