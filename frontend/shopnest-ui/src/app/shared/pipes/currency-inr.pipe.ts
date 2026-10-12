import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a number as Indian Rupees.
 * Example: 1299 -> "₹1,299.00"
 *          1299.5 -> "₹1,299.50"
 */
@Pipe({
  name: 'inr',
  standalone: true,
})
export class CurrencyInrPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '₹0.00';
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '₹0.00';

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
}