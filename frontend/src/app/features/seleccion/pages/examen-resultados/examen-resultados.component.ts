import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { forkJoin, take } from 'rxjs';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ResultadoConsolidado, ConvocatoriaSeleccionItem } from '../../models/seleccion.model';

@Component({
  selector: 'app-examen-resultados',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .stepper-circle {
      width: 22px; height: 22px; border-radius: 50%; display: inline-flex;
      align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
      border: 2px solid #d1d5db; color: #9ca3af; background: #fff; flex-shrink: 0;
    }
    .stepper-circle--active { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
    .stepper-circle--done { border-color: #22c55e; color: #fff; background: #22c55e; }
    .stepper-circle--pending { border-color: #e5e7eb; color: #d1d5db; }
    .stepper-line {
      flex: 1; height: 2px; background: #e5e7eb; min-width: 20px; max-width: 48px; margin: 0 4px;
    }
    .stepper-line--done { background: #22c55e; }
    .stepper-content { padding: 6px 0 2px 0; }
    .stepper-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px;
      border-radius: 6px; font-size: 12px; font-weight: 600; border: none; cursor: pointer;
      transition: all .15s;
    }
    .stepper-btn--green { background: #dcfce7; color: #166534; border: 1.5px solid #86efac; }
    .stepper-btn--green:hover:not(:disabled) { background: #bbf7d0; }
    .stepper-btn--blue { background: #2563eb; color: #fff; }
    .stepper-btn--blue:hover:not(:disabled) { background: #1d4ed8; }
    .stepper-btn--gray { background: #f3f4f6; color: #9ca3af; border: 1.5px solid #e5e7eb; cursor: not-allowed; }
    .stepper-btn--outline { background: #fff; color: #6b7280; border: 1px solid #d1d5db; padding: 4px 10px; border-radius: 4px; }
    .stepper-btn--outline:hover { background: #f9fafb; }
    .stepper-upload-zone {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 14px 20px; border: 2px dashed #fbbf24; border-radius: 8px;
      background: #fffbeb; transition: all .15s; text-align: center;
    }
    .stepper-upload-zone:hover { border-color: #f59e0b; background: #fef3c7; }
    .stepper-upload-done {
      display: flex; flex-direction: column; padding: 8px 12px;
      border: 1.5px solid #86efac; border-radius: 8px; background: #f0fdf4;
    }
  `],
  template: `
    <div class="space-y-4">
      <app-page-header
        title="Resultados Examen Virtual"
        subtitle="E26-V \u00b7 Resultados consolidados \u00b7 ORH genera PDF, firma y publica">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
           class="btn-ghost text-sm">\u2190 Postulantes</a>
      </app-page-header>

      @if (loading()) {
        <div class="card py-10 text-center text-gray-400">
          <span class="animate-spin inline-block mr-2 text-xl">\u27f3</span>
          <p class="mt-2 text-sm">Cargando resultados...</p>
        </div>
      } @else {
        @if (e26PublicadaSinAprobadosTecnica()) {
          <div class="card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
            <p class="font-semibold text-xs uppercase tracking-wide text-amber-900">
              E26 publicada \u2014 sin aprobados en evaluaci\u00f3n t\u00e9cnica
            </p>
            <p>No corresponde convocatoria a Entrevista Personal ni cuadro de m\u00e9ritos. El proceso se declara <strong>DESIERTO</strong> conforme a las bases cuando no hay candidatos/as aprobados/as en la etapa.</p>
            <p class="text-amber-900 text-xs">Las etapas E27 y el resultado final no aplican para este llamado.</p>
          </div>
        }
        @if (esOrhOAdmin() && hayFilasResultado()) {
          <div class="card border border-amber-200 bg-amber-50/80 p-4 space-y-3">
            <p class="text-sm font-semibold text-amber-900">Publicaci\u00f3n E26 \u2014 DS 065-2011-PCM</p>
            @if (convInfo()?.resultadosTecnicosPublicados) {
              <div class="flex flex-wrap gap-2 items-center">
                @if (e26PublicadaSinAprobadosTecnica()) {
                  <span class="text-xs text-amber-900 font-semibold bg-amber-100 border border-amber-400 px-3 py-1.5 rounded">
                    PUBLICADA \u2014 SIN APROBADOS (evaluaci\u00f3n t\u00e9cnica)
                  </span>
                } @else {
                  <span class="text-xs text-green-800 font-semibold bg-green-100 border border-green-300 px-3 py-1.5 rounded">
                    Resultados t\u00e9cnicos E26 publicados
                  </span>
                }
                <button
                  (click)="descargarPdfResultados()"
                  [disabled]="descargandoPdf()"
                  class="btn-secondary text-sm disabled:opacity-50">
                  {{ descargandoPdf() ? '\u27f3 ...' : '\u2193 Descargar PDF oficial' }}
                </button>
                <button
                  (click)="descargarPdfFirmado()"
                  [disabled]="descargandoFirmado()"
                  class="btn-secondary text-sm disabled:opacity-50">
                  {{ descargandoFirmado() ? '\u27f3 ...' : '\u2193 PDF firmado subido' }}
                </button>
              </div>
            } @else {
              <div class="flex items-center gap-0 mt-1 mb-2 flex-wrap">
                <div class="flex items-center gap-1.5">
                  <span class="stepper-circle stepper-circle--active">1</span>
                  <span class="text-[10px] font-semibold text-blue-700">Generar PDF</span>
                </div>
                <div class="stepper-line" [class.stepper-line--done]="convInfo()?.pdfFirmadoE26Subido"></div>
                <div class="flex items-center gap-1.5">
                  <span class="stepper-circle"
                    [class.stepper-circle--done]="convInfo()?.pdfFirmadoE26Subido"
                    [class.stepper-circle--active]="!convInfo()?.pdfFirmadoE26Subido">2</span>
                  <span class="text-[10px] font-semibold"
                    [class.text-green-600]="convInfo()?.pdfFirmadoE26Subido"
                    [class.text-gray-500]="!convInfo()?.pdfFirmadoE26Subido">Firmar y Subir</span>
                </div>
                <div class="stepper-line" [class.stepper-line--done]="convInfo()?.pdfFirmadoE26Subido"></div>
                <div class="flex items-center gap-1.5">
                  <span class="stepper-circle"
                    [class.stepper-circle--active]="convInfo()?.pdfFirmadoE26Subido"
                    [class.stepper-circle--pending]="!convInfo()?.pdfFirmadoE26Subido">3</span>
                  <span class="text-[10px] font-semibold"
                    [class.text-blue-700]="convInfo()?.pdfFirmadoE26Subido"
                    [class.text-gray-400]="!convInfo()?.pdfFirmadoE26Subido">Publicar</span>
                </div>
              </div>
              <div class="stepper-content">
                <button
                  (click)="descargarPdfResultados()"
                  [disabled]="descargandoPdf()"
                  class="stepper-btn stepper-btn--green disabled:opacity-50">
                  {{ descargandoPdf() ? 'Generando...' : 'Generar PDF resultados eval. t\u00e9cnica' }}
                </button>
              </div>
              <div class="stepper-content">
                @if (convInfo()?.pdfFirmadoE26Subido) {
                  <div class="stepper-upload-done">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-semibold text-green-700">PDF firmado subido</span>
                      @if (convInfo()?.fechaPdfFirmadoE26) {
                        <span class="text-xs text-gray-500">{{ convInfo()!.fechaPdfFirmadoE26! | date:'dd/MM/yyyy HH:mm' }}</span>
                      }
                    </div>
                    <label class="stepper-btn stepper-btn--outline text-[11px] cursor-pointer mt-1.5">
                      Cambiar archivo
                      <input type="file" accept=".pdf" class="hidden"
                        (change)="onUploadPdfFirmado($event)"
                        [disabled]="subiendoPdf()">
                    </label>
                  </div>
                } @else {
                  <label class="stepper-upload-zone cursor-pointer" [class.opacity-60]="subiendoPdf()">
                    <span class="text-xs font-semibold text-amber-700">
                      {{ subiendoPdf() ? 'Subiendo...' : 'Subir PDF firmado digitalmente' }}
                    </span>
                    <span class="text-[10px] text-gray-400">M\u00e1x. 10 MB \u00b7 application/pdf</span>
                    <input type="file" accept=".pdf" class="hidden"
                      (change)="onUploadPdfFirmado($event)"
                      [disabled]="subiendoPdf()">
                  </label>
                }
              </div>
              <div class="stepper-content flex items-center gap-3 flex-wrap">
                <button
                  (click)="publicarResultados()"
                  [disabled]="publicando() || !convInfo()?.pdfFirmadoE26Subido"
                  class="stepper-btn disabled:opacity-40"
                  [class.stepper-btn--blue]="convInfo()?.pdfFirmadoE26Subido"
                  [class.stepper-btn--gray]="!convInfo()?.pdfFirmadoE26Subido"
                  [title]="!convInfo()?.pdfFirmadoE26Subido ? 'Suba el PDF firmado antes de publicar' : 'Publicar resultados E26'">
                  {{ publicando() ? 'Publicando...' : 'Publicar E26' }}
                </button>
                @if (!convInfo()?.pdfFirmadoE26Subido) {
                  <span class="text-[10px] text-gray-500 italic">Requiere PDF firmado</span>
                }
              </div>
            }
          </div>
        }

        @if (resultados().length === 0) {
          <div class="card py-10 text-center">
            <p class="text-gray-500 text-sm">No hay resultados de examen virtual a\u00fan.</p>
          </div>
        } @else {
          <div class="card overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-100">
                  <th class="px-3 py-2 text-left text-xs font-semibold">#</th>
                  <th class="px-3 py-2 text-left text-xs font-semibold">Postulante</th>
                  <th class="px-3 py-2 text-center text-xs font-semibold">C\u00f3d. An\u00f3nimo</th>
                  <th class="px-3 py-2 text-center text-xs font-semibold">Estado examen</th>
                  <th class="px-3 py-2 text-center text-xs font-semibold">Correctas</th>
                  <th class="px-3 py-2 text-center text-xs font-semibold">Puntaje examen</th>
                  <th class="px-3 py-2 text-center text-xs font-semibold">Nota E12</th>
                  <th class="px-3 py-2 text-center text-xs font-semibold">Resultado</th>
                </tr>
              </thead>
              <tbody>
                @for (r of resultados(); track r.idPostulacion; let i = $index) {
                  <tr class="border-t hover:bg-gray-50">
                    <td class="px-3 py-2 text-xs text-gray-400">{{ i + 1 }}</td>
                    <td class="px-3 py-2">{{ r.nombrePostulante }}</td>
                    <td class="px-3 py-2 text-center font-mono text-xs">
                      {{ r.codigoAnonimo ?? '\u2014' }}
                    </td>
                    <td class="px-3 py-2 text-center">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded"
                            [class.bg-green-100]="r.estadoExamen === 'FINALIZADO'"
                            [class.text-green-700]="r.estadoExamen === 'FINALIZADO'"
                            [class.bg-amber-100]="r.estadoExamen === 'EN_CURSO'"
                            [class.text-amber-700]="r.estadoExamen === 'EN_CURSO'"
                            [class.bg-red-100]="r.estadoExamen === 'EXPIRADO'"
                            [class.text-red-700]="r.estadoExamen === 'EXPIRADO'"
                            [class.bg-gray-100]="r.estadoExamen === 'PENDIENTE'"
                            [class.text-gray-500]="r.estadoExamen === 'PENDIENTE'">
                        {{ r.estadoExamen }}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-center">
                      {{ r.totalCorrectas ?? '\u2014' }} / {{ r.totalPreguntas ?? '\u2014' }}
                    </td>
                    <td class="px-3 py-2 text-center font-semibold tabular-nums">
                      {{ r.puntajeTotal != null ? (r.puntajeTotal | number:'1.2-2') : '\u2014' }}
                    </td>
                    <td class="px-3 py-2 text-center tabular-nums">
                      {{ r.puntajeTecnicaEscala != null ? (r.puntajeTecnicaEscala | number:'1.2-2') : '\u2014' }}
                    </td>
                    <td class="px-3 py-2 text-center text-xs font-semibold">
                      {{ r.resultadoTecnica ?? '\u2014' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
})
export class ExamenResultadosComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly resultados = signal<ResultadoConsolidado[]>([]);
  protected readonly convInfo = signal<ConvocatoriaSeleccionItem | null>(null);
  protected readonly loading = signal(true);
  protected readonly descargandoPdf = signal(false);
  protected readonly descargandoFirmado = signal(false);
  protected readonly subiendoPdf = signal(false);
  protected readonly publicando = signal(false);

  protected readonly esOrhOAdmin = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH']),
  );

  protected readonly hayFilasResultado = computed(() => this.resultados().length > 0);

  /** APTO en evaluaci\u00f3n t\u00e9cnica (E26-V), coherente con columna Resultado del consolidado. */
  protected readonly aprobadosTecnicaExamen = computed(
    () => this.resultados().filter((r) => r.resultadoTecnica === 'APTO').length,
  );

  /** Ex\u00e1men sin nota final APTO/NO_APTO (EN_CURSO, SIN_INICIAR, etc.). */
  protected readonly hayPendientesTecnicaExamen = computed(() =>
    this.resultados().some((r) => r.resultadoTecnica === 'PENDIENTE'),
  );

  /**
   * E26 publicada y, seg\u00fan el mismo consolidado que la tabla, ning\u00fan APTO t\u00e9cnico
   * y sin evaluaciones pendientes \u2014 mensaje DESIERTO en etapa t\u00e9cnica.
   */
  protected readonly e26PublicadaSinAprobadosTecnica = computed(
    () =>
      this.convInfo()?.resultadosTecnicosPublicados === true &&
      this.hayFilasResultado() &&
      this.aprobadosTecnicaExamen() === 0 &&
      !this.hayPendientesTecnicaExamen(),
  );

  constructor() {
    forkJoin({
      resultados: this.svc.resultadosExamen(this.idConv),
      conv: this.svc.obtenerConvocatoria(this.idConv),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ resultados, conv }) => {
          this.resultados.set(resultados);
          this.convInfo.set(conv);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Error al cargar resultados o convocatoria.');
        },
      });
  }

  protected descargarPdfResultados(): void {
    if (this.descargandoPdf()) return;
    this.descargandoPdf.set(true);
    this.svc
      .resultadosTecnicaPdf(this.idConv)
      .pipe(take(1))
      .subscribe({
        next: (blob) => {
          this.triggerDownload(blob, `RESULT-TECNICA-CONV-${this.idConv}.pdf`);
          this.descargandoPdf.set(false);
        },
        error: () => {
          this.descargandoPdf.set(false);
          this.toast.error('No se pudo generar el PDF de resultados t\u00e9cnicos.');
        },
      });
  }

  protected descargarPdfFirmado(): void {
    if (this.descargandoFirmado()) return;
    this.descargandoFirmado.set(true);
    this.svc
      .descargarPdfFirmadoE26(this.idConv)
      .pipe(take(1))
      .subscribe({
        next: (blob) => {
          this.triggerDownload(blob, `RESULT-TECNICA-FIRMADO-${this.idConv}.pdf`);
          this.descargandoFirmado.set(false);
        },
        error: () => {
          this.descargandoFirmado.set(false);
          this.toast.error('No hay PDF firmado descargable.');
        },
      });
  }

  protected publicarResultados(): void {
    if (this.publicando()) return;
    this.publicando.set(true);
    this.svc
      .publicarResultadosTecnica(this.idConv)
      .pipe(take(1))
      .subscribe({
        next: (blob) => {
          this.triggerDownload(blob, `RESULT-TECNICA-PUBLICADO-${this.idConv}.pdf`);
          this.publicando.set(false);
          this.toast.success('Resultados E26 publicados.');
          this.svc
            .obtenerConvocatoria(this.idConv)
            .pipe(take(1))
            .subscribe({ next: (c) => this.convInfo.set(c) });
        },
        error: () => {
          this.publicando.set(false);
          this.toast.error('No se pudo publicar los resultados E26.');
        },
      });
  }

  protected onUploadPdfFirmado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.toast.error('Solo se permiten archivos PDF.');
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('El archivo excede 10 MB.');
      input.value = '';
      return;
    }
    this.subiendoPdf.set(true);
    this.svc
      .uploadPdfFirmadoE26(this.idConv, file)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.subiendoPdf.set(false);
          this.convInfo.update((c) =>
            c
              ? {
                  ...c,
                  pdfFirmadoE26Subido: true,
                  fechaPdfFirmadoE26: res.fechaSubida,
                }
              : c,
          );
          this.toast.success('PDF firmado subido correctamente.');
          input.value = '';
        },
        error: () => {
          this.subiendoPdf.set(false);
          this.toast.error('No se pudo subir el PDF firmado.');
          input.value = '';
        },
      });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
