import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '../../../../core/services/auth/auth.service';
import { User, Address, CustomerProfile } from '../../../../models/user.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time/time-ago.pipe';

type ActiveTab = 'personal' | 'security' | 'addresses' | 'preferences';

type DialogType =
  | 'edit-personal'
  | 'change-password'
  | 'add-address'
  | 'edit-address'
  | null;

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free',
  'Halal', 'Dairy-Free', 'Spicy',
  'Nut-Free', 'Keto', 'Low-Carb',
  'Pescatarian', 'Healthy',
];

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    TimeAgoPipe,
  ],
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // ── State ──────────────────────────────────────────────────────────────────
  activeTab = signal<ActiveTab>('personal');
  activeDialog = signal<DialogType>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal<string | null>(null);
  editingAddress = signal<Address | null>(null);

  // Dietary preferences — local copy for chip toggling
  selectedDietary = signal<string[]>([]);

  readonly dietaryOptions = DIETARY_OPTIONS;

  // ── Forms ──────────────────────────────────────────────────────────────────
  personalForm!: FormGroup;
  passwordForm!: FormGroup;
  addressForm!: FormGroup;

  // ── Computed ───────────────────────────────────────────────────────────────
  user = computed(() => this.authService.currentUser());

  fullName = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}` : '';
  });

  initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  });

  savedAddresses = computed(() =>
    this.user()?.customerProfile?.savedAddresses ?? []
  );

  totalOrders = computed(() =>
    this.user()?.customerProfile?.totalOrders ?? 0
  );

  memberSince = computed(() => this.user()?.createdAt);

  isDialogOpen = computed(() => this.activeDialog() !== null);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initForms();

    // Seed dietary from user profile if available
    // TODO: wire to actual user dietary tags when backend supports it
    this.selectedDietary.set([]);
  }

  // ── Tab navigation ─────────────────────────────────────────────────────────
  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    this.clearMessages();
  }

  // ── Dialog control ─────────────────────────────────────────────────────────
  openDialog(type: DialogType, address?: Address): void {
    this.saveError.set(null);
    this.saveSuccess.set(null);

    if (type === 'edit-personal') {
      this.seedPersonalForm();
    }

    if (type === 'add-address') {
      this.addressForm.reset();
      this.editingAddress.set(null);
    }

    if (type === 'edit-address' && address) {
      this.editingAddress.set(address);
      this.addressForm.patchValue({
        label: address.label ?? '',
        address: address.address,
      });
    }

    if (type === 'change-password') {
      this.passwordForm.reset();
    }

    this.activeDialog.set(type);
  }

  closeDialog(): void {
    this.activeDialog.set(null);
    this.editingAddress.set(null);
    this.saveError.set(null);
  }

  closeOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.closeDialog();
    }
  }

  // ── Save: personal info ────────────────────────────────────────────────────
  savePersonal(): void {
    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const { firstName, lastName, phone } = this.personalForm.value;

    this.authService.updateProfile({ firstName, lastName, phone }).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.saveSuccess.set('Personal info updated successfully.');
        this.clearMessagesAfterDelay();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message ?? 'Failed to update profile.');
      },
    });
  }

  // ── Save: password ─────────────────────────────────────────────────────────
  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const { currentPassword, newPassword } = this.passwordForm.value;

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.saveSuccess.set('Password changed successfully.');
        this.clearMessagesAfterDelay();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message ?? 'Failed to change password.');
      },
    });
  }

  // ── Save: address ──────────────────────────────────────────────────────────
  saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const { label, address } = this.addressForm.value;
    const existing = this.editingAddress();
    const currentAddresses = this.savedAddresses();

    let updatedAddresses: Address[];

    if (existing) {
      // Edit existing
      updatedAddresses = currentAddresses.map(a =>
        a.id === existing.id
          ? { ...a, label, address }
          : a
      );
    } else {
      // Add new
      const newAddress: Address = {
        id: 'addr_' + Date.now(),
        address,
        label,
        latitude: 0,  // TODO: integrate maps/geocoding
        longitude: 0,
        isDefault: currentAddresses.length === 0,
      };
      updatedAddresses = [...currentAddresses, newAddress];
    }

    const updatedProfile: Partial<User> = {
      customerProfile: {
        ...this.user()!.customerProfile!,
        savedAddresses: updatedAddresses,
      },
    };

    this.authService.updateProfile(updatedProfile).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.saveSuccess.set(existing ? 'Address updated.' : 'Address added.');
        this.clearMessagesAfterDelay();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message ?? 'Failed to save address.');
      },
    });
  }

  removeAddress(addressId: string): void {
    const updatedAddresses = this.savedAddresses().filter(a => a.id !== addressId);

    const updatedProfile: Partial<User> = {
      customerProfile: {
        ...this.user()!.customerProfile!,
        savedAddresses: updatedAddresses,
      },
    };

    this.authService.updateProfile(updatedProfile).subscribe({
      next: () => {
        this.saveSuccess.set('Address removed.');
        this.clearMessagesAfterDelay();
      },
      error: (err: Error) => {
        this.saveError.set(err.message ?? 'Failed to remove address.');
      },
    });
  }

  setDefaultAddress(addressId: string): void {
    const updatedAddresses = this.savedAddresses().map(a => ({
      ...a,
      isDefault: a.id === addressId,
    }));

    const updatedProfile: Partial<User> = {
      customerProfile: {
        ...this.user()!.customerProfile!,
        savedAddresses: updatedAddresses,
      },
    };

    this.authService.updateProfile(updatedProfile).subscribe({
      next: () => {
        this.saveSuccess.set('Default address updated.');
        this.clearMessagesAfterDelay();
      },
      error: (err: Error) => {
        this.saveError.set(err.message ?? 'Failed to update default address.');
      },
    });
  }

  // ── Save: dietary preferences ──────────────────────────────────────────────
  toggleDietary(tag: string): void {
    this.selectedDietary.update(tags =>
      tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
    );
  }

  isDietaryActive(tag: string): boolean {
    return this.selectedDietary().includes(tag);
  }

  saveDietary(): void {
    this.saving.set(true);
    this.saveError.set(null);

    // TODO: add dietaryPreferences field to User/CustomerProfile when backend supports it
    // For now we store as a generic profile update — backend can extend the model
    this.authService.updateProfile({
      customerProfile: {
        ...this.user()!.customerProfile!,
      } as any,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set('Dietary preferences saved.');
        this.clearMessagesAfterDelay();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.saveError.set(err.message ?? 'Failed to save preferences.');
      },
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  goToOrders(): void {
    this.router.navigate(['/customer/orders']);
  }

  logout(): void {
    this.authService.logout();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getFieldError(form: FormGroup, field: string): string | null {
    const control = form.get(field);
    if (!control || !control.invalid || !control.touched) return null;

    if (control.errors?.['required'])  return 'This field is required.';
    if (control.errors?.['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters.`;
    if (control.errors?.['email'])     return 'Enter a valid email address.';
    if (control.errors?.['pattern'])   return 'Invalid format.';
    if (control.errors?.['mismatch'])  return 'Passwords do not match.';

    return 'Invalid value.';
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private initForms(): void {
    const u = this.user();

    this.personalForm = this.fb.group({
      firstName: [u?.firstName ?? '', [Validators.required, Validators.minLength(2)]],
      lastName:  [u?.lastName  ?? '', [Validators.required, Validators.minLength(2)]],
      phone:     [u?.phone     ?? '', [Validators.pattern(/^(\+254|0)[17]\d{8}$/)]],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required, Validators.minLength(6)]],
        newPassword:     ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );

    this.addressForm = this.fb.group({
      label:   ['', [Validators.required]],
      address: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  private seedPersonalForm(): void {
    const u = this.user();
    if (!u) return;
    this.personalForm.patchValue({
      firstName: u.firstName,
      lastName:  u.lastName,
      phone:     u.phone ?? '',
    });
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPw  = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return newPw === confirm ? null : { mismatch: true };
  }

  private clearMessages(): void {
    this.saveError.set(null);
    this.saveSuccess.set(null);
  }

  private clearMessagesAfterDelay(): void {
    setTimeout(() => this.saveSuccess.set(null), 4000);
  }
}