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

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Order, OrderStatus, OrderSummary } from '../../../models/order.model';
import { CurrencyKesPipe } from '../../../shared/pipes/currency/currency-kes.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time/time-ago.pipe';

type StatusFilter = 'all' | OrderStatus;

interface StatusConfig {
  label: string;
  icon: string;
  color: string;
}

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending:    { label: 'Pending',     icon: 'schedule',        color: '#f7b731' },
  confirmed:  { label: 'Confirmed',   icon: 'check_circle',    color: '#26de81' },
  preparing:  { label: 'Preparing',   icon: 'restaurant',      color: '#ff6b35' },
  ready:      { label: 'Ready',       icon: 'done_all',        color: '#26de81' },
  picked_up:  { label: 'Picked Up',   icon: 'directions_bike', color: '#4a90e2' },
  delivering: { label: 'On the Way',  icon: 'local_shipping',  color: '#4a90e2' },
  delivered:  { label: 'Delivered',   icon: 'home',            color: '#26de81' },
  cancelled:  { label: 'Cancelled',   icon: 'cancel',          color: '#e74c3c' },
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    CurrencyKesPipe,
    TimeAgoPipe,
  ],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersComponent implements OnInit {
  private router = inject(Router);

  loading = signal(true);
  orders = signal<Order[]>([]);
  activeFilter = signal<StatusFilter>('all');

  readonly filterTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all',       label: 'All Orders' },
    { id: 'pending',   label: 'Pending'    },
    { id: 'preparing', label: 'Preparing'  },
    { id: 'delivering',label: 'On the Way' },
    { id: 'delivered', label: 'Delivered'  },
    { id: 'cancelled', label: 'Cancelled'  },
  ];

  filteredOrders = computed(() => {
    const filter = this.activeFilter();
    const all = this.orders();
    if (filter === 'all') return all;
    return all.filter(o => o.status === filter);
  });

  activeOrders = computed(() =>
    this.orders().filter(o =>
      ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivering']
        .includes(o.status)
    )
  );

  hasResults = computed(() => this.filteredOrders().length > 0);

  ngOnInit(): void {
    this.loadOrders();
  }

  setFilter(filter: StatusFilter): void {
    this.activeFilter.set(filter);
  }

  viewOrder(id: string): void {
    this.router.navigate(['/customer/orders', id]);
  }

  browseMore(): void {
    this.router.navigate(['/customer/browse-meals']);
  }

  getStatusConfig(status: OrderStatus): StatusConfig {
    return STATUS_CONFIG[status];
  }

  isActive(status: OrderStatus): boolean {
    return ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivering']
      .includes(status);
  }

  trackByOrderId(_: number, order: Order): string {
    return order.id;
  }

  private loadOrders(): void {
    setTimeout(() => {
      this.orders.set(this.getMockOrders());
      this.loading.set(false);
    }, 700);
  }

  private getMockOrders(): Order[] {
    return [
      {
        id: 'ORD-001',
        customerId: 'u001',
        cookId: 'cook_001',
        cookName: "Chef Maria's Kitchen",
        items: [
          { mealId: 'm001', mealName: 'Beef Pilau with Kachumbari', quantity: 2, price: 350, subtotal: 700 },
          { mealId: 'm002', mealName: 'Avocado Smoothie', quantity: 1, price: 130, subtotal: 130 },
        ],
        subtotal: 830,
        deliveryFee: 0,
        serviceFee: 42,
        total: 872,
        status: 'delivering',
        deliveryAddress: { street: '14 Ngong Road', area: 'Kilimani', city: 'Nairobi' },
        paymentMethod: 'mpesa',
        paymentStatus: 'paid',
        createdAt: new Date(Date.now() - 35 * 60000),
        estimatedDeliveryTime: new Date(Date.now() + 15 * 60000),
      },
      {
        id: 'ORD-002',
        customerId: 'u001',
        cookId: 'cook_002',
        cookName: 'Spice Garden',
        items: [
          { mealId: 'm003', mealName: 'Chicken Biryani', quantity: 1, price: 400, subtotal: 400 },
        ],
        subtotal: 400,
        deliveryFee: 100,
        serviceFee: 20,
        total: 520,
        status: 'delivered',
        deliveryAddress: { street: '14 Ngong Road', area: 'Kilimani', city: 'Nairobi' },
        paymentMethod: 'card',
        paymentStatus: 'paid',
        createdAt: new Date(Date.now() - 2 * 3600000),
        deliveredAt: new Date(Date.now() - 1.5 * 3600000),
      },
      {
        id: 'ORD-003',
        customerId: 'u001',
        cookId: 'cook_003',
        cookName: "Mama Njeri's",
        items: [
          { mealId: 'm004', mealName: 'Githeri Special', quantity: 3, price: 180, subtotal: 540 },
          { mealId: 'm005', mealName: 'Mandazi & Chai', quantity: 2, price: 120, subtotal: 240 },
        ],
        subtotal: 780,
        deliveryFee: 0,
        serviceFee: 39,
        total: 819,
        status: 'preparing',
        deliveryAddress: { street: '14 Ngong Road', area: 'Kilimani', city: 'Nairobi' },
        paymentMethod: 'mpesa',
        paymentStatus: 'paid',
        createdAt: new Date(Date.now() - 20 * 60000),
        estimatedDeliveryTime: new Date(Date.now() + 25 * 60000),
      },
      {
        id: 'ORD-004',
        customerId: 'u001',
        cookId: 'cook_001',
        cookName: "Chef Maria's Kitchen",
        items: [
          { mealId: 'm006', mealName: 'Fish Fillet & Coconut Rice', quantity: 1, price: 450, subtotal: 450 },
        ],
        subtotal: 450,
        deliveryFee: 100,
        serviceFee: 23,
        total: 573,
        status: 'cancelled',
        deliveryAddress: { street: '14 Ngong Road', area: 'Kilimani', city: 'Nairobi' },
        paymentMethod: 'cash',
        paymentStatus: 'refunded',
        createdAt: new Date(Date.now() - 24 * 3600000),
        cancelledAt: new Date(Date.now() - 23 * 3600000),
        cancellationReason: 'Cook unavailable',
      },
    ];
  }
}