import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

import { ApiService } from '@core/http/api.service';

/** Payload inyectado al abrir el diálogo desde la lista pública. */
export interface ComunicadosPublicosDialogData {
  idConvocatoria: number;
  numeroConvocatoria: string;
}

interface ComunicadoPublico {
  idComunicado: number;
  idConvocatoria: number;
  titulo: string;
  descripcion: string;
  fechaPublicacion: string;
}

@Component({
  selector: 'app-comunicados-publicos-dialog',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './comunicados-publicos-dialog.component.html',
  styleUrl: './comunicados-publicos-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComunicadosPublicosDialogComponent implements OnInit {
  private readonly ref = inject(DialogRef<void>);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject(DIALOG_DATA) as ComunicadosPublicosDialogData;

  readonly numero = this.data.numeroConvocatoria;
  readonly loading = signal(true);
  readonly items = signal<ComunicadoPublico[]>([]);

  ngOnInit(): void {
    this.api
      .get<ComunicadoPublico[]>(
        `/convocatorias/publicas/${this.data.idConvocatoria}/comunicados`,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  cerrar(): void {
    this.ref.close();
  }
}
