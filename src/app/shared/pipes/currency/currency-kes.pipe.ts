import { Pipe, PipeTransform } from '@angular/core';

/**
 * Currency KES Pipe
 * Formats numbers as Kenyan Shillings (KES)
 * 
 * Usage:
 * {{ 1000 | currencyKes }} => "KES 1,000"
 * {{ 1500.50 | currencyKes }} => "KES 1,500.50"
 * {{ 1000 | currencyKes:false }} => "1,000" (without symbol)
 */
@Pipe({
  name: 'currencyKes',
  standalone: true,
})
export class CurrencyKesPipe implements PipeTransform {
  transform(value: number | null | undefined, showSymbol: boolean = true): string {
    if (value === null || value === undefined) {
      return showSymbol ? 'KES 0' : '0';
    }

    // Format number with commas and decimals
    const formatted = this.formatNumber(value);

    return showSymbol ? `KES ${formatted}` : formatted;
  }

  private formatNumber(value: number): string {
    // Round to 2 decimal places
    const rounded = Math.round(value * 100) / 100;

    // Split into integer and decimal parts
    const parts = rounded.toFixed(2).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Add thousand separators
    const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Only show decimals if not .00
    if (decimalPart === '00') {
      return withCommas;
    }

    return `${withCommas}.${decimalPart}`;
  }
}