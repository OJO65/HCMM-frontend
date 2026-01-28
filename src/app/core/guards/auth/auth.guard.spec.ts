import { TestBed } from '@angular/core/testing';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard, guestGuard, autoLoginGuard } from './auth.guard';
import { AuthService } from '../../services/auth/auth.service';
import { UserRole } from '../../../models/user.model';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'getUserRole',
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/protected-route' } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should allow access when user is authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(true);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/protected-route' },
    });
  });

  it('should pass the current URL as returnUrl query parameter', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);
    const customState = { url: '/admin/settings' } as RouterStateSnapshot;
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    executeGuard(mockRoute, customState);

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/admin/settings' },
    });
  });

  it('should handle empty URL in state', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);
    const emptyState = { url: '' } as RouterStateSnapshot;
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    executeGuard(mockRoute, emptyState);

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '' },
    });
  });
});

describe('guestGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => guestGuard(...guardParameters));

  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'getUserRole',
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/auth/login' } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should allow access when user is not authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(true);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    expect(mockAuthService.getUserRole).not.toHaveBeenCalled();
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect authenticated customer to customer dashboard', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue('customer' as UserRole | null);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    expect(mockAuthService.getUserRole).toHaveBeenCalledTimes(1);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith([
      '/customer/dashboard',
    ]);
  });

  it('should redirect authenticated cook to cook dashboard', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue('cook' as UserRole | null);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/cook/dashboard']);
  });

  it('should redirect authenticated delivery_guy to delivery_guy dashboard', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue(
      'delivery_guy' as UserRole | null,
    );
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);
 
    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith([
      '/delivery_guy/dashboard',
    ]);
  });

  it('should redirect authenticated admin to admin dashboard', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue('admin' as UserRole | null);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('should redirect to root when authenticated user has null role', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue(null);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('should redirect to root when authenticated user has undefined role', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue(undefined as any);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('should redirect to root when authenticated user has unknown role', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue('unknown_role' as any);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});

describe('autoLoginGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => autoLoginGuard(...guardParameters));

  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'getUserRole',
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/' } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should allow access when user is not authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(true);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    expect(mockAuthService.getUserRole).not.toHaveBeenCalled();
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect authenticated customer to customer dashboard', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue('customer' as UserRole | null);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    expect(mockAuthService.getUserRole).toHaveBeenCalledTimes(1);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith([
      '/customer/dashboard',
    ]);
  });

  it('should redirect authenticated cook to cook dashboard', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue('cook' as UserRole | null);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/cook/dashboard']);
  });

  it('should redirect authenticated delivery_guy to delivery_guy dashboard', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue(
      'delivery_guy' as UserRole | null,
    );
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith([
      '/delivery_guy/dashboard',
    ]);
  });

  it('should redirect authenticated admin to admin dashboard', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue('admin' as UserRole | null);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('should redirect to customer dashboard when authenticated user has no role', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue(null);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith([
      '/customer/dashboard',
    ]);
  });

  it('should redirect to customer dashboard when authenticated user has undefined role', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue(undefined as any);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith([
      '/customer/dashboard',
    ]);
  });

  it('should redirect to customer dashboard when authenticated user has unknown role', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    mockAuthService.getUserRole.and.returnValue('unknown_role' as any);
    const mockUrlTree = {} as UrlTree;
    mockRouter.createUrlTree.and.returnValue(mockUrlTree);

    const result = executeGuard(mockRoute, mockState);

    expect(result).toBe(mockUrlTree);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith([
      '/customer/dashboard',
    ]);
  });
});
