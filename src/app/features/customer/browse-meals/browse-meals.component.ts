import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';

import { CurrencyKesPipe } from '../../../shared/pipes/currency/currency-kes.pipe';
import { Meal } from '../../../models/meal.model';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryTab {
  id: string;
  label: string;
  icon: string;
}

type SortOption = 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'prep_time';

interface ActiveFilters {
  category: string;
  sortBy: SortOption;
  maxPrice: number;
  maxPrepTime: number;
  dietaryTags: string[];
  minRating: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-browse-meals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSliderModule,
    MatBadgeModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatBottomSheetModule,
    CurrencyKesPipe,
  ],
  templateUrl: './browse-meals.component.html',
  styleUrls: ['./browse-meals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrowseMealsComponent implements OnInit {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // ── State signals ──────────────────────────────────────────────────────────
  loading = signal(true);
  allMeals = signal<Meal[]>([]);
  searchQuery = signal('');
  filtersOpen = signal(false);
  currentPage = signal(1);
  readonly pageSize = 12;

  activeFilters = signal<ActiveFilters>({
    category: 'all',
    sortBy: 'popular',
    maxPrice: 2000,
    maxPrepTime: 120,
    dietaryTags: [],
    minRating: 0,
  });

  // ── Search stream ──────────────────────────────────────────────────────────
  private searchSubject = new Subject<string>();

  // ── Static data ────────────────────────────────────────────────────────────
  readonly categories: CategoryTab[] = [
    { id: 'all',        label: 'All',         icon: 'restaurant_menu' },
    { id: 'Main Course',label: 'Main Course', icon: 'lunch_dining'    },
    { id: 'Breakfast',  label: 'Breakfast',   icon: 'free_breakfast'  },
    { id: 'Vegetarian', label: 'Vegetarian',  icon: 'eco'             },
    { id: 'Snack',      label: 'Snacks',      icon: 'fastfood'        },
    { id: 'Dessert',    label: 'Dessert',     icon: 'icecream'        },
    { id: 'Beverage',   label: 'Drinks',      icon: 'local_cafe'      },
  ];

  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'popular',    label: '🔥 Most Popular'   },
    { value: 'rating',     label: '⭐ Highest Rated'  },
    { value: 'price_asc',  label: '💰 Price: Low–High' },
    { value: 'price_desc', label: '💰 Price: High–Low' },
    { value: 'prep_time',  label: '⚡ Quickest First'  },
  ];

  readonly dietaryOptions: string[] = [
    'Vegetarian', 'Vegan', 'Gluten-Free',
    'Halal', 'Dairy-Free', 'Spicy',
  ];

  // ── Computed ───────────────────────────────────────────────────────────────
  filteredMeals = computed(() => {
    const meals  = this.allMeals();
    const query  = this.searchQuery().toLowerCase().trim();
    const f      = this.activeFilters();

    return meals
      .filter(m => {
        // search
        if (query && !m.name.toLowerCase().includes(query) &&
                     !m.description.toLowerCase().includes(query) &&
                     !m.cookName.toLowerCase().includes(query)) {
          return false;
        }
        // category
        if (f.category !== 'all' && m.category !== f.category) return false;
        // price
        if (m.price > f.maxPrice) return false;
        // prep time
        if (m.prepTime > f.maxPrepTime) return false;
        // rating
        if (f.minRating > 0 && (m.rating ?? 0) < f.minRating) return false;
        // dietary tags
        if (f.dietaryTags.length > 0) {
          const mTags = m.dietaryTags ?? [];
          if (!f.dietaryTags.every(t => mTags.includes(t as any))) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (f.sortBy) {
          case 'rating':     return (b.rating ?? 0) - (a.rating ?? 0);
          case 'price_asc':  return a.price - b.price;
          case 'price_desc': return b.price - a.price;
          case 'prep_time':  return a.prepTime - b.prepTime;
          default:           return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        }
      });
  });

  paginatedMeals = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredMeals().slice(start, start + this.pageSize);
  });

  totalPages = computed(() =>
    Math.ceil(this.filteredMeals().length / this.pageSize)
  );

  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  activeFilterCount = computed(() => {
    const f = this.activeFilters();
    let count = 0;
    if (f.category !== 'all')   count++;
    if (f.sortBy !== 'popular') count++;
    if (f.maxPrice < 2000)      count++;
    if (f.maxPrepTime < 120)    count++;
    if (f.minRating > 0)        count++;
    count += f.dietaryTags.length;
    return count;
  });

  hasResults     = computed(() => this.filteredMeals().length > 0);
  resultCount    = computed(() => this.filteredMeals().length);
  hasMorePages   = computed(() => this.currentPage() < this.totalPages());
  skeletonItems  = Array.from({ length: 8 });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Debounce search input
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.currentPage.set(1);
    });

    this.loadMeals();
  }

  // ── Public methods ─────────────────────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  selectCategory(id: string): void {
    this.activeFilters.update(f => ({ ...f, category: id }));
    this.currentPage.set(1);
  }

  updateSort(value: SortOption): void {
    this.activeFilters.update(f => ({ ...f, sortBy: value }));
    this.currentPage.set(1);
  }

  updateMaxPrice(value: number): void {
    this.activeFilters.update(f => ({ ...f, maxPrice: value }));
    this.currentPage.set(1);
  }

  updateMaxPrepTime(value: number): void {
    this.activeFilters.update(f => ({ ...f, maxPrepTime: value }));
    this.currentPage.set(1);
  }

  updateMinRating(value: number): void {
    this.activeFilters.update(f => ({ ...f, minRating: value }));
    this.currentPage.set(1);
  }

  toggleDietaryTag(tag: string): void {
    this.activeFilters.update(f => {
      const tags = f.dietaryTags.includes(tag)
        ? f.dietaryTags.filter(t => t !== tag)
        : [...f.dietaryTags, tag];
      return { ...f, dietaryTags: tags };
    });
    this.currentPage.set(1);
  }

  isDietaryActive(tag: string): boolean {
    return this.activeFilters().dietaryTags.includes(tag);
  }

  resetFilters(): void {
    this.activeFilters.set({
      category: 'all',
      sortBy: 'popular',
      maxPrice: 2000,
      maxPrepTime: 120,
      dietaryTags: [],
      minRating: 0,
    });
    this.currentPage.set(1);
  }

  toggleFilters(): void {
    this.filtersOpen.update(v => !v);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  viewMeal(id: string): void {
    this.router.navigate(['/customer/meal', id]);
  }

  getStarArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  trackByMealId(_: number, meal: Meal): string {
    return meal.id;
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private loadMeals(): void {
    // TODO: replace with actual service call
    setTimeout(() => {
      this.allMeals.set(this.getMockMeals());
      this.loading.set(false);
    }, 900);
  }

  // ── Mock data (remove when connecting backend) ─────────────────────────────
  private getMockMeals(): Meal[] {
    const base: Omit<Meal, 'id' | 'name' | 'description' | 'price' | 'category' | 'cuisine' | 'prepTime' | 'rating' | 'reviewCount' | 'tags' | 'dietaryTags'>= {
      cookId: 'cook_001',
      cookName: "Chef Maria's Kitchen",
      isAvailable: true,
      createdAt: new Date(),
    };

    return [
      {
        ...base,
        id: 'm001', name: 'Beef Pilau with Kachumbari',
        description: 'Aromatic spiced rice with tender beef, served with fresh tomato and onion kachumbari',
        price: 350, category: 'Main Course', cuisine: 'Kenyan',
        prepTime: 35, rating: 4.8, reviewCount: 312,
        tags: ['Filling', 'Spiced', 'Popular'],
        dietaryTags: ['Halal'],
        cookName: "Chef Maria's Kitchen",
      },
      {
        ...base,
        id: 'm002', name: 'Chicken Biryani',
        description: 'Fragrant basmati rice layered with marinated chicken, caramelised onions and aromatic spices',
        price: 400, category: 'Main Course', cuisine: 'Indian',
        prepTime: 45, rating: 4.9, reviewCount: 520,
        tags: ['Best Seller', 'Aromatic'],
        dietaryTags: ['Halal'],
        cookName: "Spice Garden",
      },
      {
        ...base,
        id: 'm003', name: 'Githeri Special',
        description: 'Traditional mixed maize and beans slow-cooked with tomatoes, onions and spices',
        price: 180, category: 'Main Course', cuisine: 'Kikuyu',
        prepTime: 20, rating: 4.5, reviewCount: 198,
        tags: ['Traditional', 'Budget-Friendly'],
        dietaryTags: ['Vegetarian', 'Vegan'],
        cookName: "Mama Njeri's",
      },
      {
        ...base,
        id: 'm004', name: 'Chapati & Beef Stew',
        description: 'Soft layered chapatis served with rich, slow-cooked beef stew and vegetables',
        price: 280, category: 'Main Course', cuisine: 'Kenyan',
        prepTime: 25, rating: 4.7, reviewCount: 445,
        tags: ['Popular', 'Comfort Food'],
        dietaryTags: ['Halal'],
        cookName: "Jiko Express",
      },
      {
        ...base,
        id: 'm005', name: 'Fish Fillet & Coconut Rice',
        description: 'Fresh Nile perch fillet pan-seared golden, served with aromatic coconut rice and steamed vegetables',
        price: 450, category: 'Main Course', cuisine: 'Coastal',
        prepTime: 30, rating: 4.8, reviewCount: 267,
        tags: ['Healthy', 'Fresh'],
        dietaryTags: ['Gluten-Free', 'Dairy-Free'],
        cookName: "Chef Maria's Kitchen",
      },
      {
        ...base,
        id: 'm006', name: 'Mukimo with Nyama Choma',
        description: 'Creamy mashed green peas, potatoes and maize with fire-roasted meat',
        price: 550, category: 'Main Course', cuisine: 'Kikuyu',
        prepTime: 50, rating: 4.9, reviewCount: 189,
        tags: ['Traditional', 'Weekend Special'],
        dietaryTags: ['Gluten-Free'],
        cookName: "Nyumbani Kitchen",
      },
      {
        ...base,
        id: 'm007', name: 'Mandazi & Chai',
        description: 'Freshly fried coconut mandazi served with a pot of spiced Kenyan chai',
        price: 120, category: 'Breakfast', cuisine: 'Kenyan',
        prepTime: 15, rating: 4.6, reviewCount: 380,
        tags: ['Quick', 'Morning Favourite'],
        dietaryTags: ['Vegetarian'],
        cookName: "Sunrise Bites",
      },
      {
        ...base,
        id: 'm008', name: 'Ugali, Sukuma Wiki & Eggs',
        description: 'Classic Kenyan staple – firm ugali with sautéed collard greens and sunny-side eggs',
        price: 150, category: 'Breakfast', cuisine: 'Kenyan',
        prepTime: 20, rating: 4.4, reviewCount: 290,
        tags: ['Classic', 'Hearty'],
        dietaryTags: ['Vegetarian', 'Gluten-Free'],
        cookName: "Mama Njeri's",
      },
      {
        ...base,
        id: 'm009', name: 'Matoke Stew',
        description: 'Green plantains slow-cooked in rich tomato, onion and coconut sauce',
        price: 220, category: 'Vegetarian', cuisine: 'Luhya',
        prepTime: 40, rating: 4.6, reviewCount: 143,
        tags: ['Vegan', 'Authentic'],
        dietaryTags: ['Vegan', 'Gluten-Free'],
        cookName: "Lake View Kitchen",
      },
      {
        ...base,
        id: 'm010', name: 'Smoky Samosa (6 pcs)',
        description: 'Golden-fried crispy samosas stuffed with spiced minced beef and vegetables',
        price: 160, category: 'Snack', cuisine: 'Kenyan',
        prepTime: 10, rating: 4.7, reviewCount: 612,
        tags: ['Quick', 'Popular', 'Snack'],
        dietaryTags: ['Halal'],
        cookName: "Spice Garden",
      },
      {
        ...base,
        id: 'm011', name: 'Mahamri & Mango Juice',
        description: 'Fluffy coconut cardamom mahamri paired with freshly squeezed mango juice',
        price: 140, category: 'Beverage', cuisine: 'Coastal',
        prepTime: 12, rating: 4.5, reviewCount: 201,
        tags: ['Refreshing', 'Coastal Favourite'],
        dietaryTags: ['Vegetarian', 'Dairy-Free'],
        cookName: "Swahili Corner",
      },
      {
        ...base,
        id: 'm012', name: 'Lemon Bars',
        description: 'Buttery shortbread crust with silky lemon curd, dusted with powdered sugar',
        price: 200, category: 'Dessert', cuisine: 'Continental',
        prepTime: 8, rating: 4.8, reviewCount: 95,
        tags: ['Sweet', 'Treat'],
        dietaryTags: ['Vegetarian'],
        cookName: "Sweet Tooth Bakery",
      },
      {
        ...base,
        id: 'm013', name: 'Nyama Choma Platter',
        description: 'Slow-roasted goat or beef with kachumbari, ugali and roasted vegetables — serves 2',
        price: 900, category: 'Main Course', cuisine: 'Kenyan',
        prepTime: 90, rating: 5.0, reviewCount: 156,
        tags: ['Sharing', 'Weekend Special', 'Premium'],
        dietaryTags: ['Gluten-Free'],
        cookName: "Nyumbani Kitchen",
      },
      {
        ...base,
        id: 'm014', name: 'Vegetable Spring Rolls (8 pcs)',
        description: 'Crispy rice-paper rolls stuffed with fresh vegetables, served with sweet chilli sauce',
        price: 175, category: 'Snack', cuisine: 'Fusion',
        prepTime: 10, rating: 4.3, reviewCount: 88,
        tags: ['Light', 'Vegan'],
        dietaryTags: ['Vegan', 'Dairy-Free'],
        cookName: "Fusion Bites",
      },
      {
        ...base,
        id: 'm015', name: 'Pojo (Black-Eyed Peas)',
        description: 'Coastal-style black-eyed peas cooked in coconut milk with aromatic spices',
        price: 190, category: 'Vegetarian', cuisine: 'Coastal',
        prepTime: 30, rating: 4.6, reviewCount: 112,
        tags: ['Protein-Rich', 'Coastal'],
        dietaryTags: ['Vegan', 'Gluten-Free'],
        cookName: "Swahili Corner",
      },
      {
        ...base,
        id: 'm016', name: 'Avocado Smoothie',
        description: 'Creamy blended avocado with milk, honey and a touch of vanilla — chilled to perfection',
        price: 130, category: 'Beverage', cuisine: 'Kenyan',
        prepTime: 5, rating: 4.7, reviewCount: 340,
        tags: ['Healthy', 'Refreshing'],
        dietaryTags: ['Vegetarian'],
        cookName: "Sunrise Bites",
      },
    ];
  }
}