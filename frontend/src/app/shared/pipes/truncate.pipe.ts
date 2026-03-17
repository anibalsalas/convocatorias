import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para truncar texto largo con ellipsis
 * Uso: {{ texto | truncate:50 }}
 */
@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, limit: number = 50, trail: string = '...'): string {
    if (!value) return '';
    return value.length > limit ? value.substring(0, limit).trim() + trail : value;
  }
}
