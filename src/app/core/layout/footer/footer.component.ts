import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * App Footer Component
 * Reusable footer for the entire application
 * Contains links, social media, and company information
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  private readonly router = inject(Router);

  currentYear = new Date().getFullYear();

  // Footer sections
  customerLinks = [
    { label: 'Browse Meals', action: () => this.router.navigate(['/auth/register'], { queryParams: { role: 'customer' } }) },
    { label: 'How It Works', action: () => this.scrollToSection('how-it-works') },
    { label: 'Cuisines', action: () => this.scrollToSection('cuisines') },
    { label: 'Track Order', route: '/customer/orders' }
  ];

  cookLinks = [
    { label: 'Become a Cook', action: () => this.router.navigate(['/auth/register'], { queryParams: { role: 'cook' } }) },
    { label: 'Benefits', action: () => this.scrollToSection('for-cooks') },
    { label: 'Getting Started', action: () => this.scrollToSection('how-it-works') },
    { label: 'Cook Dashboard', route: '/cook/dashboard' }
  ];

  deliveryLinks = [
    { label: 'Become a Partner', action: () => this.router.navigate(['/auth/register'], { queryParams: { role: 'delivery' } }) },
    { label: 'Earnings', action: () => this.scrollToSection('how-it-works') },
    { label: 'Requirements', action: () => this.scrollToSection('how-it-works') }
  ];

  supportLinks = [
    { label: 'Help Center', route: '#' },
    { label: 'Contact Us', route: '#' },
    { label: 'FAQs', route: '#' },
    { label: 'Safety', route: '#' }
  ];

  legalLinks = [
    { label: 'Privacy Policy', route: '#' },
    { label: 'Terms of Service', route: '#' },
    { label: 'Cookie Policy', route: '#' }
  ];

  socialLinks = [
    { icon: 'facebook', url: '#', label: 'Facebook' },
    { icon: 'twitter', url: '#', label: 'Twitter' },
    { icon: 'instagram', url: '#', label: 'Instagram' },
    { icon: 'linkedin', url: '#', label: 'LinkedIn' }
  ];

  scrollToSection(sectionId: string): void {
    // Check if we're on the landing page
    if (this.router.url !== '/') {
      this.router.navigate(['/'], { fragment: sectionId });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  handleLinkClick(link: any): void {
    if (link.route && link.route !== '#') {
      this.router.navigate([link.route]);
    } else if (link.action) {
      link.action();
    }
  }
}