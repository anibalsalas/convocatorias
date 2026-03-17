import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formato de moneda peruana: S/ 10,500.00
 * Uso: {{ monto | currencyPeru }}
 */
@Pipe({ name: 'currencyPeru', standalone: true })
export class CurrencyPeruPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return 'S/ 0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'S/ 0.00';
    return 'S/ ' + num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
