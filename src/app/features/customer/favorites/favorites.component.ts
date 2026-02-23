import {
  Component,
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

import { FavoritesService } from '../../../core/services/favorites/favorites.service';
import { FavoriteMeal } from '../../../models/favorite.model';
import { CurrencyKesPipe } from '../../../shared/pipes/currency/currency-kes.pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time/time-ago.pipe';

type SortOption = 'saved_at' | 'name' | 'price_asc' | 'price_desc' | 'rating';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    CurrencyKesPipe,
    TimeAgoPipe,
  ],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesComponent {
  private router = inject(Router);
  readonly favoritesService = inject(FavoritesService);

  sortBy = signal<SortOption>('saved_at');

  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'saved_at',   label: '🕐 Recently Saved' },
    { value: 'rating',     label: '⭐ Highest Rated'  },
    { value: 'name',       label: '🔤 Name (A–Z)'     },
    { value: 'price_asc',  label: '💰 Price: Low–High' },
    { value: 'price_desc', label: '💰 Price: High–Low' },
  ];

  // ── Computed ───────────────────────────────────────────────────────────────
  sortedFavorites = computed(() => {
    const favs = [...this.favoritesService.favorites()];
    const sort = this.sortBy();

    return favs.sort((a, b) => {
      switch (sort) {
        case 'name':       return a.name.localeCompare(b.name);
        case 'rating':     return b.rating - a.rating;
        case 'price_asc':  return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        default:           return b.savedAt.getTime() - a.savedAt.getTime();
      }
    });
  });

  isEmpty = computed(() => this.favoritesService.count() === 0);

  // ── Actions ────────────────────────────────────────────────────────────────
  updateSort(value: SortOption): void {
    this.sortBy.set(value);
  }

  viewMeal(id: string): void {
    this.router.navigate(['/customer/meal', id]);
  }

  remove(event: Event, mealId: string): void {
    // Stop propagation so the card click (viewMeal) doesn't also fire
    event.stopPropagation();
    this.favoritesService.remove(mealId);
  }

  browseMore(): void {
    this.router.navigate(['/customer/browse-meals']);
  }

  getStarArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  trackById(_: number, fav: FavoriteMeal): string {
    return fav.id;
  }
}