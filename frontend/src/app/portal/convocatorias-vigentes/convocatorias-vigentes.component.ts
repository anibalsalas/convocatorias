import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toObservable } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { concat, of, switchMap, map, catchError, throwError, finalize } from 'rxjs';

import { ApiService } from '@core/http/api.service';
import { PostulantePerfilService } from '@core/services/postulante-perfil.service';
import { PostulacionService } from '@core/services/postulacion.service';
import { ToastService } from '@core/services/toast.service';
import { Page } from '@shared/models/pagination.model';
import { PostulantePerfil } from '@shared/models/postulante-perfil.model';
import { RegistrarPostulacionRequest } from '@shared/models/postulacion.model';

interface ConvocatoriaVigenteItem {
  idConvocatoria: number;
  numeroConvocatoria: string;
  descripcion: string;
  objetoContratacion: string;
  estado: string;
  anio: number;
  unidadOrganica?: string | null;
  fuenteFinanciamiento?: string | null;
  fechaPublicacion?: string | null;
  fechaIniPostulacion?: string | null;
  fechaFinPostulacion?: string | null;
  fechaEvaluacion?: string | null;
  fechaResultado?: string | null;
  linkPortalAcffaa?: string | null;
  linkTalentoPeru?: string | null;
  nombrePuesto?: string | null;
}

const PROFILE_INCOMPLETE_ERROR = 'PROFILE_INCOMPLETE';

interface PageResult {
  state: 'loading' | 'success' | 'error';
  data?: Page<ConvocatoriaVigenteItem>;
}

@Component({
  selector: 'app-convocatorias-vigentes',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './convocatorias-vigentes.component.html',
  styleUrl: './convocatorias-vigentes.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConvocatoriasVigentesComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly perfilService = inject(PostulantePerfilService);
  private readonly postulacionService = inject(PostulacionService);
  private readonly toast = inject(ToastService);

  private readonly loadTrigger = signal(0);
  private readonly pageResult = toSignal(
    toObservable(this.loadTrigger).pipe(
      switchMap(() =>
        concat(
          of<PageResult>({ state: 'loading' }),
          this.api
            .getPage<ConvocatoriaVigenteItem>(
              '/convocatorias/publicas',
              {
                page: 0,
                size: 100,
                sort: 'fechaPublicacion,desc',
              },
              { anio: String(new Date().getFullYear()) },
            )
            .pipe(
              map((res) => ({ state: 'success' as const, data: res.data })),
              catchError(() => of<PageResult>({ state: 'error' })),
            ),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as PageResult },
  );

  readonly loading = computed(() => this.pageResult()?.state === 'loading');
  readonly convocatorias = computed(() => {
    const data = this.pageResult()?.data?.content;
    if (!data) return [];
    return this.filterVigentes(data);
  });

  readonly applyingIds = signal<number[]>([]);
  readonly currentYear = new Date().getFullYear();

  readonly showSuccessModal = signal(false);
  readonly createdPostulationId = signal<number | null>(null);
  readonly createdPostulationProcess = signal('');
  readonly createdPostulationJob = signal('');
  readonly skeletonRows = [1, 2, 3, 4, 5];

  constructor() {
    effect(() => {
      if (this.pageResult()?.state === 'error') {
        this.toast.error('No se pudo obtener la lista de convocatorias vigentes.');
      }
    });
  }

  postular(item: ConvocatoriaVigenteItem): void {
    if (this.isApplying(item.idConvocatoria)) {
      return;
    }

    this.addApplying(item.idConvocatoria);

    this.perfilService
      .getMiPerfil()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((response) => {
          const perfil = response.data;

          if (!this.perfilCompleto(perfil)) {
            this.router.navigate(['/portal/mi-perfil'], {
              queryParams: { section: 'preview' },
            });

            return throwError(() => new Error(PROFILE_INCOMPLETE_ERROR));
          }

          const request = this.buildPostulacionRequest(item.idConvocatoria, perfil);
          return this.postulacionService.registrar(request);
        }),
        finalize(() => this.removeApplying(item.idConvocatoria)),
      )
      .subscribe({
        next: (response: { data: { idPostulacion: number } }) => {
          this.createdPostulationId.set(response.data.idPostulacion);
          this.createdPostulationProcess.set(item.numeroConvocatoria || '—');
          this.createdPostulationJob.set(this.resolveNombrePuesto(item));
          this.showSuccessModal.set(true);
        },
        error: (error: unknown) => {
          const message = this.resolveErrorMessage(error);

          if (message === PROFILE_INCOMPLETE_ERROR) {
            this.toast.warning(
              'Complete su perfil antes de postular. Revise todas las secciones y la vista previa.',
            );
            return;
          }

          if (message.includes('ya se encuentra registrado')) {
            this.toast.warning('Usted ya se encuentra registrado en esta convocatoria. Continúe con su expediente virtual.');
            this.router.navigate(['/portal/postulaciones']);
            return;
          }

          this.toast.error(message);
        },
      });
  }

  continueToExpediente(): void {
    const idPostulacion = this.createdPostulationId();
    this.showSuccessModal.set(false);

    if (!idPostulacion) {
      this.router.navigate(['/portal/postulaciones']);
      return;
    }

    this.router.navigate(['/portal/expediente', idPostulacion]);
  }

  goToMisPostulaciones(): void {
    this.showSuccessModal.set(false);
    this.router.navigate(['/portal/postulaciones']);
  }

  closeSuccessModal(): void {
    this.showSuccessModal.set(false);
  }

  isApplying(idConvocatoria: number): boolean {
    return this.applyingIds().includes(idConvocatoria);
  }

  resolveNombrePuesto(item: ConvocatoriaVigenteItem): string {
    return item.nombrePuesto || item.descripcion || '—';
  }

  private filterVigentes(items: ConvocatoriaVigenteItem[]): ConvocatoriaVigenteItem[] {
    return items.filter((item) => this.isVigente(item));
  }

  private isVigente(item: ConvocatoriaVigenteItem): boolean {
    const estadoValido =
      item.estado === 'PUBLICADA' || item.estado === 'EN_SELECCION';

    if (!estadoValido) {
      return false;
    }

    const inicio = this.normalizeDate(item.fechaIniPostulacion);
    const fin = this.normalizeDate(item.fechaFinPostulacion);
    const hoy = this.normalizeDate(new Date().toISOString().slice(0, 10));

    if (inicio === null || fin === null || hoy === null) {
      return false;
    }

    return hoy >= inicio && hoy <= fin;
  }

  private normalizeDate(value?: string | null): number | null {
    if (!value) {
      return null;
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime();
  }

  private perfilCompleto(perfil: PostulantePerfil): boolean {
    return Boolean(
      perfil.tipoDocumento &&
        perfil.numeroDocumento &&
        perfil.nombres &&
        perfil.apellidoPaterno &&
        perfil.apellidoMaterno &&
        perfil.email &&
        perfil.telefono &&
        perfil.fechaNacimiento &&
        perfil.direccion &&
        perfil.ubigeo,
    );
  }

  private buildPostulacionRequest(
    idConvocatoria: number,
    perfil: PostulantePerfil,
  ): RegistrarPostulacionRequest {
    return {
      idConvocatoria,
      tipoDocumento: perfil.tipoDocumento,
      numeroDocumento: perfil.numeroDocumento,
      nombres: perfil.nombres,
      apellidoPaterno: perfil.apellidoPaterno,
      apellidoMaterno: perfil.apellidoMaterno,
      email: perfil.email,
      telefono: perfil.telefono,
      genero: perfil.genero,
      fechaNacimiento: perfil.fechaNacimiento,
      direccion: perfil.direccion,
      ubigeo: perfil.ubigeo,
      esLicenciadoFfaa: perfil.esLicenciadoFfaa,
      esPersonaDiscap: perfil.esPersonaDiscap,
      esDeportistaDest: perfil.esDeportistaDest,
      declaracionesJuradas: [
        { tipoDeclaracion: 'VERACIDAD', aceptada: true },
        { tipoDeclaracion: 'ANTECEDENTES', aceptada: true },
        { tipoDeclaracion: 'NEPOTISMO', aceptada: true },
      ],
    };
  }

  private addApplying(idConvocatoria: number): void {
    this.applyingIds.update((ids) =>
      ids.includes(idConvocatoria) ? ids : [...ids, idConvocatoria],
    );
  }

  private removeApplying(idConvocatoria: number): void {
    this.applyingIds.update((ids) => ids.filter((id) => id !== idConvocatoria));
  }

  private resolveErrorMessage(error: unknown): string {
    const candidate = error as {
      error?: { message?: string };
      message?: string;
    };

    return (
      candidate?.error?.message ||
      candidate?.message ||
      'No se pudo registrar la postulación.'
    );
  }
}
