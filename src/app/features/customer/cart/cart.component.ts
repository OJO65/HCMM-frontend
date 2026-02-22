import {
  Component,
  OnInit,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CartItem, AddOn } from '../../../models/cart.model';
import { CartService } from '../../../core/services/cart/cart.service';
import { CurrencyKesPipe } from '../../../shared/pipes/currency/currency-kes.pipe';

type PaymentMethod = 'mpesa' | 'card' | 'cash';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatInputModule,
    MatFormFieldModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    CurrencyKesPipe,
  ],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  readonly cart = inject(CartService);

  loading = false;
  processingOrder = false;

  selectedPaymentMethod: PaymentMethod = 'mpesa';

  deliveryForm!: FormGroup;
  paymentForm!: FormGroup;

  // ───── COMPUTED VALUES ─────
  isEmpty = computed(() => this.cart.items().length === 0);
  subtotal = computed(() => this.cart.totalPrice());
  itemCount = computed(() => this.cart.itemCount());

  deliveryFee = computed(() => (this.subtotal() >= 1000 ? 0 : 100));
  serviceFee = computed(() => Math.round(this.subtotal() * 0.05));
  total = computed(() => this.subtotal() + this.deliveryFee() + this.serviceFee());

  freeDeliveryProgress = computed(() => {
    const threshold = 1000;
    return this.subtotal() >= threshold ? 100 : (this.subtotal() / threshold) * 100;
  });

  amountToFreeDelivery = computed(() => {
    const threshold = 1000;
    return Math.max(0, threshold - this.subtotal());
  });

  ngOnInit(): void {
    this.initForms();
  }

  // ───── CART ACTIONS ─────
  incrementQuantity(itemId: string, currentQty: number) {
    this.cart.updateQuantity(itemId, currentQty + 1);
  }

  decrementQuantity(itemId: string, currentQty: number) {
    this.cart.updateQuantity(itemId, currentQty - 1);
  }

  removeItem(itemId: string) {
    this.cart.removeItem(itemId);
  }

  clearCart() {
    if (confirm('Clear cart?')) {
      this.cart.clearCart();
    }
  }

  getItemTotal(item: CartItem): number {
    const addOnsTotal = item.addOns.reduce((sum, addon) => sum + addon.price, 0);
    return (item.meal.price + addOnsTotal) * item.quantity;
  }

  continueShopping() {
    this.router.navigate(['/customer/browse-meals']);
  }



trackByAddonId(_: number, addon: AddOn): string {
  return addon.id;
}


  // ───── PAYMENT ─────
  setPaymentMethod(method: PaymentMethod) {
    this.selectedPaymentMethod = method;
    this.updatePaymentValidation(method);
  }

  placeOrder() {
    if (!this.deliveryForm.valid || !this.paymentForm.valid) {
      this.deliveryForm.markAllAsTouched();
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.processingOrder = true;
    setTimeout(() => {
      const orderId = 'ORD' + Date.now();
      this.processingOrder = false;
      this.cart.clearCart();
      this.router.navigate(['/customer/orders', orderId]);
    }, 1500);
  }

  trackByItemId(_: number, item: CartItem) {
    return item.id;
  }

  // ───── FORMS ─────
  private initForms() {
    this.deliveryForm = this.fb.group({
      address: ['', [Validators.required, Validators.minLength(5)]],
      instructions: [''],
      phone: ['', [Validators.required, Validators.pattern(/^(\+254|0)[17]\d{8}$/)]],
    });

    this.paymentForm = this.fb.group({
      mpesaPhone: [''],
      cardNumber: [''],
      cardExpiry: [''],
      cardCvv: [''],
    });

    this.updatePaymentValidation(this.selectedPaymentMethod);
  }

  private updatePaymentValidation(method: PaymentMethod) {
    const mpesa = this.paymentForm.get('mpesaPhone');
    const cardNumber = this.paymentForm.get('cardNumber');
    const cardExpiry = this.paymentForm.get('cardExpiry');
    const cardCvv = this.paymentForm.get('cardCvv');

    mpesa?.clearValidators();
    cardNumber?.clearValidators();
    cardExpiry?.clearValidators();
    cardCvv?.clearValidators();

    if (method === 'mpesa') {
      mpesa?.setValidators([
        Validators.required,
        Validators.pattern(/^(\+254|0)[17]\d{8}$/)
      ]);
    }

    if (method === 'card') {
      cardNumber?.setValidators([Validators.required, Validators.pattern(/^\d{16}$/)]);
      cardExpiry?.setValidators([Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]);
      cardCvv?.setValidators([Validators.required, Validators.pattern(/^\d{3,4}$/)]);
    }

    mpesa?.updateValueAndValidity();
    cardNumber?.updateValueAndValidity();
    cardExpiry?.updateValueAndValidity();
    cardCvv?.updateValueAndValidity();
  }
}
