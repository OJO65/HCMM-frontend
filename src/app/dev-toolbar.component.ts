// src/app/dev-toolbar.component.ts
// TEMPORARY: For testing without backend - Remove before production!

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './core/services/auth/auth.service';

@Component({
  selector: 'app-dev-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="dev-toolbar">
      <div class="toolbar-header">
        <mat-icon>build</mat-icon>
        <span>Dev Tools</span>
      </div>
      
      <div class="toolbar-actions">
        <button 
          mat-mini-fab 
          color="primary"
          (click)="loginAsCustomer()"
          matTooltip="Login as Customer"
          aria-label="Login as customer">
          <mat-icon>person</mat-icon>
        </button>

        <button 
          mat-mini-fab 
          color="accent"
          (click)="loginAsCook()"
          matTooltip="Login as Cook"
          aria-label="Login as cook">
          <mat-icon>restaurant</mat-icon>
        </button>

        <button 
          mat-mini-fab 
          color="primary"
          (click)="loginAsDelivery()"
          matTooltip="Login as Delivery"
          aria-label="Login as delivery person">
          <mat-icon>two_wheeler</mat-icon>
        </button>

        <button 
          mat-mini-fab 
          color="accent"
          (click)="loginAsAdmin()"
          matTooltip="Login as Admin"
          aria-label="Login as admin">
          <mat-icon>admin_panel_settings</mat-icon>
        </button>

        <button 
          mat-mini-fab 
          color="warn"
          (click)="logout()"
          matTooltip="Logout"
          aria-label="Logout">
          <mat-icon>logout</mat-icon>
        </button>
      </div>

      @if (authService.isAuthenticated()) {
        <div class="current-user">
          <mat-icon class="user-icon">account_circle</mat-icon>
          <div class="user-info">
            <div class="user-name">
              {{ authService.currentUser()?.firstName }} 
              {{ authService.currentUser()?.lastName }}
            </div>
            <div class="user-role">{{ authService.currentUser()?.role }}</div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dev-toolbar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      min-width: 220px;
      border: 2px solid #ff6b35;
    }

    .toolbar-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
      font-weight: 600;
      font-size: 14px;
      color: #2d3436;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #ff6b35;
      }
    }

    .toolbar-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;

      button {
        width: 100%;
      }
    }

    .current-user {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: rgba(255, 107, 53, 0.1);
      border-radius: 8px;
      margin-top: 12px;

      .user-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #ff6b35;
      }

      .user-info {
        flex: 1;
        min-width: 0;
      }

      .user-name {
        font-size: 12px;
        font-weight: 600;
        color: #2d3436;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .user-role {
        font-size: 10px;
        color: #636e72;
        text-transform: uppercase;
      }
    }

    @media (max-width: 768px) {
      .dev-toolbar {
        bottom: 10px;
        right: 10px;
        left: 10px;
        max-width: 300px;
        margin: 0 auto;
      }
    }
  `]
})
export class DevToolbarComponent {
  readonly authService = inject(AuthService);

  loginAsCustomer(): void {
    // Call your new mock login method
    (this.authService as any).mockLoginAsCustomer();
  }

  loginAsCook(): void {
    (this.authService as any).mockLoginAsCook();
  }

  loginAsDelivery(): void {
    (this.authService as any).mockLoginAsDelivery();
  }

  loginAsAdmin(): void {
    (this.authService as any).mockLoginAsAdmin();
  }

  logout(): void {
    this.authService.logout();
  }
}