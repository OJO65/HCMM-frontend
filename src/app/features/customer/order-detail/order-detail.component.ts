import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Location } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Order, OrderStatus } from '../../../models/order.model';
import { CurrencyKesPipe } from '../../../shared/pipes/currency/currency-kes.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time/time-ago.pipe';

interface StatusStep {
  status: OrderStatus;
  label: string;
  icon: string;
  time?: Date;
}

@Component({
  selector: 'app-order-detail',
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
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);

  loading = signal(true);
  order = signal<Order | null>(null);

  // The ordered progression of statuses for the tracker
  private readonly STATUS_FLOW: OrderStatus[] = [
    'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivering', 'delivered'
  ];

  statusSteps = computed<StatusStep[]>(() => {
    const o = this.order();
    if (!o) return [];

    return [
      { status: 'pending',    label: 'Order Placed',    icon: 'receipt',         time: o.createdAt       },
      { status: 'confirmed',  label: 'Confirmed',       icon: 'check_circle',    time: o.confirmedAt     },
      { status: 'preparing',  label: 'Being Prepared',  icon: 'restaurant',      time: o.confirmedAt     },
      { status: 'ready',      label: 'Ready',           icon: 'done_all',        time: o.preparedAt      },
      { status: 'picked_up',  label: 'Picked Up',       icon: 'directions_bike', time: o.pickedUpAt      },
      { status: 'delivering', label: 'On the Way',      icon: 'local_shipping',  time: o.pickedUpAt      },
      { status: 'delivered',  label: 'Delivered',       icon: 'home',            time: o.deliveredAt     },
    ];
  });

  currentStepIndex = computed(() => {
    const o = this.order();
    if (!o || o.status === 'cancelled') return -1;
    return this.STATUS_FLOW.indexOf(o.status);
  });

  isCancelled = computed(() => this.order()?.status === 'cancelled');
  isDelivered = computed(() => this.order()?.status === 'delivered');
  isActive    = computed(() =>
    !this.isCancelled() && !this.isDelivered()
  );

  getStepState(index: number): 'completed' | 'current' | 'upcoming' {
    const current = this.currentStepIndex();
    if (index < current)  return 'completed';
    if (index === current) return 'current';
    return 'upcoming';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/customer/orders']);
      return;
    }
    this.loadOrder(id);
  }

  goBack(): void {
    this.location.back();
  }

  reorder(): void {
    // TODO: implement reorder logic via cart service
    this.router.navigate(['/customer/browse-meals']);
  }

  trackByMealId(_: number, item: { mealId: string }): string {
    return item.mealId;
  }

  private loadOrder(id: string): void {
    setTimeout(() => {
      this.order.set(this.getMockOrder(id));
      this.loading.set(false);
    }, 600);
  }

  private getMockOrder(id: string): Order {
    // Default mock — in real app, fetch by id
    return {
      id,
      customerId: 'u001',
      cookId: 'cook_001',
      cookName: "Chef Maria's Kitchen",
      deliveryPersonName: 'James Otieno',
      items: [
        { mealId: 'm001', mealName: 'Beef Pilau with Kachumbari', quantity: 2, price: 350, subtotal: 700 },
        { mealId: 'm002', mealName: 'Avocado Smoothie', quantity: 1, price: 130, subtotal: 130 },
      ],
      subtotal: 830,
      deliveryFee: 0,
      serviceFee: 42,
      total: 872,
      status: 'delivering',
      deliveryAddress: {
        street: '14 Ngong Road',
        area: 'Kilimani',
        city: 'Nairobi',
        instructions: 'Blue gate, ring the bell twice',
      },
      paymentMethod: 'mpesa',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 35 * 60000),
      confirmedAt: new Date(Date.now() - 30 * 60000),
      preparedAt: new Date(Date.now() - 15 * 60000),
      pickedUpAt: new Date(Date.now() - 10 * 60000),
      estimatedDeliveryTime: new Date(Date.now() + 15 * 60000),
    };
  }
}