// src/app/core/services/cart/cart.service.ts
import { Injectable, computed, signal } from '@angular/core';
import { CartItem } from '../../../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _items = signal<CartItem[]>([]);

  // Reactive signals for components to consume
  readonly items = this._items.asReadonly();

  readonly itemCount = computed(() =>
    this._items().reduce((sum, i) => sum + i.quantity, 0)
  );

  readonly totalPrice = computed(() =>
    this._items().reduce((sum, item) => {
      const addOnsTotal = item.addOns.reduce((s, a) => s + a.price, 0);
      return sum + (item.meal.price + addOnsTotal) * item.quantity;
    }, 0)
  );

  addItem(item: CartItem): void {
    const existing = this._items().find(i => i.id === item.id);
    if (existing) {
      this.updateQuantity(item.id, existing.quantity + item.quantity);
    } else {
      this._items.update(items => [...items, item]);
    }
  }

  updateQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }
    this._items.update(items =>
      items.map(item => item.id === itemId ? { ...item, quantity } : item)
    );
  }

  removeItem(itemId: string): void {
    this._items.update(items => items.filter(i => i.id !== itemId));
  }

  clearCart(): void {
    this._items.set([]);
  }
}