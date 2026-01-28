import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  User,
  UserRole,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenPayload,
} from '../../../models/user.model';
import { StorageService } from '../storage/storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);

  private readonly apiUrl = 'https://localhost:8000/api';

  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = this.storage.getAccessToken();
    const user = this.storage.getUser<User>();

    if (token && user && this.isTokenValid(token)) {
      this.setCurrentUser(user);
    } else {
      this.clearAuthData();
    }
  }

  private setCurrentUser(user: User | null): void {
    this.currentUser.set(user);
    this.isAuthenticated.set(!!user);
    this.currentUserSubject.next(user);
  }

  private isTokenValid(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  private decodeToken(token: string): TokenPayload {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.storage.setAccessToken(response.accessToken);
    this.storage.setRefreshToken(response.refreshToken);
    this.storage.setUser(response.user);
    this.setCurrentUser(response.user);

    this.navigateToRoleDashboard(response.user.role);
  }

  private navigateToRoleDashboard(role: UserRole): void {
    const roleRoutes: Record<UserRole, string> = {
      [UserRole.CUSTOMER]: '/customer/dashboard',
      [UserRole.DELIVERY_GUY]: '/delivery/dashboard',
      [UserRole.ADMIN]: '/admin/dashboard',
      [UserRole.COOK]: '/cook/dashboard',
    };
    this.router.navigate([roleRoutes[role] || '/']);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage =
        error.error?.message ||
        `Error Code: ${error.status}\nMessage ${error.message}`;
    }

    console.error('Auth Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  private clearAuthData(): void {
    this.storage.clear();
    this.setCurrentUser(null);
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response) => this.handleAuthSuccess(response)),
        catchError((error) => this.handleError(error)),
        tap(() => this.isLoading.set(false)),
      );
  }

  logout(): void {
    const refreshToken = this.storage.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({
        error: (err) => console.error('Logout error', err),
      });
    }
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, userData)
      .pipe(
        tap((response) => this.handleAuthSuccess(response)),
        catchError((error) => this.handleError(error)),
        tap(() => this.isLoading.set(false)),
      );
  }

  getAccessToken(): string | null {
    return this.storage.getAccessToken();
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.storage.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh-token`, { refreshToken })
      .pipe(
        tap((response) => {
          this.storage.setAccessToken(response.accessToken);
          if (response.refreshToken) {
            this.storage.setRefreshToken(response.refreshToken);
          }
        }),
        catchError((error) => {
          this.logout();
          return throwError(() => error);
        }),
      );
  }

  getCurrentUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`).pipe(
      tap((user) => {
        this.setCurrentUser(user);
        this.storage.setUser(user);
      }),
      catchError((error) => this.handleError(error)),
    );
  }

  updateProfile(userData: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/profile`, userData).pipe(
      tap((user) => {
        this.setCurrentUser(user);
        this.storage.setUser(user);
      }),
      catchError((error) => this.handleError(error)),
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email })
      .pipe(catchError((error) => this.handleError(error)));
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/reset-password`, {
        token,
        newPassword,
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/verify-email`, { token })
      .pipe(catchError((error) => this.handleError(error)));
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.currentUser()?.role;
    return userRole ? roles.includes(userRole) : false;
  }

  getUserRole(): UserRole | null {
    return this.currentUser()?.role || null;
  }
}
