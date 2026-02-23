import { Injectable, signal, computed } from '@angular/core';
import { FavoriteMeal } from '../../../models/favorite.model';

const STORAGE_KEY = 'hc_favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private _favorites = signal<FavoriteMeal[]>(this.loadFromStorage());

  // ── Public API ─────────────────────────────────────────────────────────────
  readonly favorites = this._favorites.asReadonly();

  readonly count = computed(() => this._favorites().length);

  isFavorite(mealId: string): boolean {
    return this._favorites().some(f => f.id === mealId);
  }

  add(meal: FavoriteMeal): void {
    if (this.isFavorite(meal.id)) return;
    this._favorites.update(favs => [...favs, meal]);
    this.persist();
  }

  remove(mealId: string): void {
    this._favorites.update(favs => favs.filter(f => f.id !== mealId));
    this.persist();
  }

  toggle(meal: FavoriteMeal): void {
    this.isFavorite(meal.id) ? this.remove(meal.id) : this.add(meal);
  }

  // ── localStorage ───────────────────────────────────────────────────────────
  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._favorites()));
    } catch {
      console.warn('FavoritesService: could not write to localStorage');
    }
  }

  private loadFromStorage(): FavoriteMeal[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as FavoriteMeal[];

      // Rehydrate savedAt as a real Date (JSON.parse gives strings)
      return parsed.map(f => ({ ...f, savedAt: new Date(f.savedAt) }));
    } catch {
      return [];
    }
  }
}