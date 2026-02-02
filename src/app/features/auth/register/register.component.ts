import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth/auth.service';
import { RegisterRequest, UserRole } from '../../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatStepperModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);

  registerForm!: FormGroup;
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  isLoading = signal(false);

  // User roles for selection
  userRoles = [
    { value: UserRole.CUSTOMER, label: 'Customer', icon: 'person', description: 'Order delicious home-cooked meals' },
    { value: UserRole.COOK, label: 'Cook/Chef', icon: 'restaurant', description: 'Share your culinary skills and earn' },
    { value: UserRole.DELIVERY_GUY, label: 'Delivery Partner', icon: 'delivery_dining', description: 'Deliver meals and earn flexible income' }
  ];

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.registerForm = this.fb.group({
      // Personal Information
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9]{10,15}$/)]],
      
      // Account Information
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordStrengthValidator
      ]],
      confirmPassword: ['', [Validators.required]],
      
      // Role Selection
      role: [UserRole.CUSTOMER, [Validators.required]],
      
      // Terms & Conditions
      acceptTerms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Custom validator for password strength
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

    return !passwordValid ? {
      passwordStrength: {
        hasUpperCase,
        hasLowerCase,
        hasNumeric,
        hasSpecialChar
      }
    } : null;
  }

  // Custom validator for password match
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.hidePassword.update(value => !value);
    } else {
      this.hideConfirmPassword.update(value => !value);
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading.set(true);

    const userData: RegisterRequest = {
      firstName: this.registerForm.value.firstName.trim(),
      lastName: this.registerForm.value.lastName.trim(),
      email: this.registerForm.value.email.trim().toLowerCase(),
      phone: this.registerForm.value.phone?.trim(),
      password: this.registerForm.value.password,
      role: this.registerForm.value.role
    };

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.toastr.success(
          'Your account has been created successfully!',
          'Registration Successful'
        );
        
        // Navigation is handled by AuthService
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Registration error:', error);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // Mark all form fields as touched to show validation errors
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Helper methods for template
  getErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    
    if (control?.hasError('minlength')) {
      const minLength = control.getError('minlength').requiredLength;
      return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
    }

    if (control?.hasError('pattern')) {
      if (fieldName === 'phone') {
        return 'Please enter a valid phone number (10-15 digits)';
      }
    }

    if (control?.hasError('passwordStrength')) {
      return 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (fieldName === 'confirmPassword' && this.registerForm.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      password: 'Password',
      confirmPassword: 'Confirm password',
      role: 'Role'
    };
    return labels[fieldName] || fieldName;
  }

  hasError(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // Password strength indicator
  getPasswordStrength(): { level: number; label: string; color: string } {
    const password = this.registerForm.get('password')?.value || '';
    
    if (!password) {
      return { level: 0, label: '', color: '' };
    }

    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 2) {
      return { level: 1, label: 'Weak', color: 'warn' };
    } else if (strength <= 3) {
      return { level: 2, label: 'Fair', color: 'accent' };
    } else if (strength <= 4) {
      return { level: 3, label: 'Good', color: 'primary' };
    } else {
      return { level: 4, label: 'Strong', color: 'primary' };
    }
  }
}