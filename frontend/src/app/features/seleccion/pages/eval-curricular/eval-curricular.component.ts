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
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { forkJoin, take, finalize, timeout, TimeoutError, switchMap } from 'rxjs';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import {
  PostulacionSeleccion,
  ConvocatoriaSeleccionItem,
  FactorDetalle,
  EvalCurricularResponse,
  ExpedienteItem,
} from '../../models/seleccion.model';

/** Subcriterio listo para input */
interface SubcriterioEval {
  idFactor: number;
  criterio: string;
  puntaje: number;
  puntajeMaximo: number;
  puntajeMinimo: number;
  idPadre: number;
}

interface EntradaEval {
  idPostulacion: number;
  nombre: string;
  /** Subcriterios agrupados por padre: Map<idPadre, SubcriterioEval[]> */
  subcriterios: SubcriterioEval[];
  totalCache: number;
  expandido: boolean;
  documentos: ExpedienteItem[];
  cargandoDocs: boolean;
  /** Estado real de la postulación — usado para detectar modo resultados */
  estado: string;
  /** true cuando el postulante es VERIFICADO (NO APTO) — inputs bloqueados, observación visible */
  esNoApto: boolean;
  /** Texto readonly derivado de DL1451 + RF07 — no se persiste en BD, es lectura pura */
  observacionNoApto: string;
}

const PAGE_SIZE = 10;
const UMBRAL_PAGINADO = 15;

/**
 * Observación automática para VERIFICADO (NO APTO) en E24.
 * Derivada en tiempo real de flags ya persistidos en TBL_POSTULACION.
 * No genera ningún almacenamiento nuevo — lectura pura de datos existentes.
 *
 * Reglas (SOLID — Single Responsibility, función pura sin side effects):
 *  CON_SANCIONES + NO_ADMITIDO → ambos filtros fallaron
 *  SIN_SANCIONES + NO_ADMITIDO → solo RF-07 falló
 *  CON_SANCIONES + RF07=NULL  → solo DL1451 falló (auto-transición E19)
 */
function observacionParaNoApto(p: PostulacionSeleccion): string {
  const conSanciones = p.verificacionRnssc === 'CON_SANCIONES'
                    || p.verificacionRegiprec === 'CON_SANCIONES';
  const noAdmitido   = p.admisionRf07 === 'NO_ADMITIDO';
  if (conSanciones && noAdmitido)
    return 'No pasó el Filtro DL 1451 y No cumple con los Requisitos Mínimos exigidos por el perfil';
  if (!conSanciones && noAdmitido)
    return 'No cumplió con los Requisitos Mínimos exigidos por el perfil';
  return 'No pasó con el Filtro de D.L. 1451 - Verificación Obligatoria de Inhabilitaciones';
}

@Component({
  selector: 'app-eval-curricular',
  standalone: true,
  imports: [RouterLink, FormsModule, PageHeaderComponent, DecimalPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
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
        title="Evaluación Curricular"
        [subtitle]="subtitleDinamico()">
        <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
           class="btn-ghost text-sm">← Postulantes</a>
      </app-page-header>

      <!-- Banner RF-09 + barra de progreso -->
      <div class="card border-l-4 border-blue-500 bg-blue-50 py-3 px-4 space-y-2">
        <div class="flex items-start gap-3">
          <span class="text-lg">📋</span>
          <div class="text-xs text-blue-800 flex-1">
            <p class="font-semibold">Evaluación Curricular RF-09 — Motor de Reglas</p>
            <p class="mt-0.5">
              @if (modoResultados() || yaTodosEvaluados()) {
                Resultados registrados de la evaluación curricular. Vista de solo lectura.
              } @else {
                Ingrese el puntaje por criterio para cada postulante en estado
                <strong>VERIFICADO</strong>. Expanda cada fila para ver los documentos del expediente.
              }
            </p>
            @if (umbralEfectivo() > 0) {
              <p class="mt-1 font-semibold">
                Umbral mínimo:
                <span class="bg-blue-200 px-2 py-0.5 rounded font-mono">
                  {{ umbralEfectivo() | number:'1.0-0' }} pts
                </span>
                · Máximo posible:
                <span class="bg-blue-200 px-2 py-0.5 rounded font-mono">
                  {{ puntajeMaximoTotal() | number:'1.0-0' }} pts
                </span>
              </p>
            }
          </div>
        </div>

        <!-- Barra de progreso -->
        @if (!loading() && entradas().length > 0) {
          <div class="space-y-1">
            <div class="flex justify-between text-xs text-blue-700 font-medium">
              <span>
                {{ evaluadosCount() }} de {{ entradas().length }} evaluados
                @if (aptosPreview() > 0) {
                  · <span class="text-green-700">{{ aptosPreview() }} APTOS</span>
                }
                @if (noAptosPreview() > 0) {
                  · <span class="text-red-600">{{ noAptosPreview() }} NO APTOS</span>
                }
              </span>
              <span>{{ progresoPct() }}%</span>
            </div>
            <div class="w-full bg-blue-200 rounded-full h-2">
              <div
                class="h-2 rounded-full transition-all duration-300"
                [class]="progresoPct() === 100 ? 'bg-green-500' : 'bg-blue-500'"
                [style.width]="progresoPct() + '%'"
              ></div>
            </div>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="card py-10 text-center text-gray-400">
          <span class="animate-spin inline-block mr-2 text-xl">⟳</span>
          <p class="mt-2 text-sm">Cargando postulantes verificados y criterios...</p>
        </div>

      } @else if (entradas().length === 0) {
        <div class="card py-10 text-center space-y-3">
          @if (modoResultados()) {
            <p class="text-gray-500 font-medium">No se encontraron resultados de evaluación curricular.</p>
          } @else {
            <p class="text-gray-500 font-medium">No hay postulantes en estado VERIFICADO para evaluar.</p>
          }
          <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
             class="btn-secondary text-sm inline-block">← Ir a Postulantes</a>
        </div>

      } @else {
        <!-- Panel resultado post-envío (sesión actual) -->
        @if (resultado()) {
          <div class="card border border-green-300 bg-green-50 p-4 space-y-2">
            <p class="font-semibold text-green-700 text-sm">
              ✓ Evaluación registrada — {{ resultado()!.mensaje }}
            </p>
            <div class="flex flex-wrap gap-6 text-sm">
              <div>Evaluados: <strong>{{ resultado()!.totalEvaluados }}</strong></div>
              <div class="text-green-700">APTO: <strong>{{ resultado()!.totalAptos }}</strong></div>
              <div class="text-red-600">NO APTO: <strong>{{ resultado()!.totalNoAptos }}</strong></div>
              @if (resultado()!.umbralAplicado) {
                <div class="text-blue-700">
                  Umbral aplicado:
                  <strong>{{ resultado()!.umbralAplicado | number:'1.2-2' }} pts</strong>
                </div>
              }
            </div>
            <div class="flex flex-wrap gap-2 mt-2 items-center">
              @if (esComiteOAdmin() && !esOrhOAdmin()) {
                <span class="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded">
                  ℹ️ Los resultados serán publicados por ORH
                </span>
              }
              @if (esOrhOAdmin()) {
                <a [routerLink]="['/sistema/seleccion', idConv, 'codigos-anonimos']"
                   class="btn-secondary text-sm inline-block">
                  Continuar → E25 Códigos Anónimos
                </a>
              }
            </div>
          </div>
        }

        <!-- Panel acciones en modoResultados (re-entrada sin resultado en sesión) -->
        @if (modoResultados() && !resultado()) {
          <div class="card border border-blue-200 bg-blue-50 p-4 space-y-3">
            <p class="font-semibold text-blue-700 text-sm">
              Resultados de evaluación curricular E24 — Vista de solo lectura
            </p>

            <!-- COMITÉ: solo ve estado, no puede publicar -->
            @if (esComiteOAdmin() && !esOrhOAdmin()) {
              <div class="flex flex-wrap gap-2 items-center">
                @if (convInfo()?.resultadosCurricularPublicados) {
                  <span class="text-xs text-green-700 font-semibold bg-green-100 border border-green-300 px-3 py-1.5 rounded">
                    ✅ Resultados E24 ya publicados por ORH
                  </span>
                } @else {
                  <span class="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded">
                    ℹ️ Los resultados serán publicados por ORH
                  </span>
                }
              </div>
            }

            <!-- ORH: flujo de 3 pasos — Generar PDF → Subir Firmado → Publicar -->
            @if (esOrhOAdmin()) {
              @if (convInfo()?.resultadosCurricularPublicados) {
                <div class="flex flex-wrap gap-2 items-center">
                  <span class="text-xs text-green-700 font-semibold bg-green-100 border border-green-300 px-3 py-1.5 rounded">
                    ✅ Resultados E24 ya publicados
                  </span>
                  <button
                    (click)="descargarResultados()"
                    [disabled]="descargandoPdf()"
                    class="btn-secondary text-sm disabled:opacity-50"
                  >
                    {{ descargandoPdf() ? '⟳ Descargando...' : '↓ Descargar PDF E24' }}
                  </button>
                </div>
              } @else {
                <!-- Stepper visual -->
                <div class="flex items-center gap-0 mt-1 mb-2">
                  <!-- Paso 1 indicator -->
                  <div class="flex items-center gap-1.5">
                    <span class="stepper-circle stepper-circle--active">1</span>
                    <span class="text-[10px] font-semibold text-blue-700">Generar PDF</span>
                  </div>
                  <div class="stepper-line" [class.stepper-line--done]="convInfo()?.pdfFirmadoE24Subido"></div>
                  <!-- Paso 2 indicator -->
                  <div class="flex items-center gap-1.5">
                    <span class="stepper-circle"
                      [class.stepper-circle--done]="convInfo()?.pdfFirmadoE24Subido"
                      [class.stepper-circle--active]="!convInfo()?.pdfFirmadoE24Subido">2</span>
                    <span class="text-[10px] font-semibold"
                      [class.text-green-600]="convInfo()?.pdfFirmadoE24Subido"
                      [class.text-gray-500]="!convInfo()?.pdfFirmadoE24Subido">Firmar y Subir</span>
                  </div>
                  <div class="stepper-line" [class.stepper-line--done]="convInfo()?.pdfFirmadoE24Subido"></div>
                  <!-- Paso 3 indicator -->
                  <div class="flex items-center gap-1.5">
                    <span class="stepper-circle"
                      [class.stepper-circle--active]="convInfo()?.pdfFirmadoE24Subido"
                      [class.stepper-circle--pending]="!convInfo()?.pdfFirmadoE24Subido">3</span>
                    <span class="text-[10px] font-semibold"
                      [class.text-blue-700]="convInfo()?.pdfFirmadoE24Subido"
                      [class.text-gray-400]="!convInfo()?.pdfFirmadoE24Subido">Publicar</span>
                  </div>
                </div>

                <!-- Paso 1: Generar PDF -->
                <div class="stepper-content">
                  <button
                    (click)="descargarResultados()"
                    [disabled]="descargandoPdf()"
                    class="stepper-btn stepper-btn--green disabled:opacity-50"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {{ descargandoPdf() ? 'Generando...' : 'Generar PDF Resultados Eval. Curricular' }}
                  </button>
                </div>

                <!-- Paso 2: Subir PDF firmado -->
                <div class="stepper-content">
                  @if (convInfo()?.pdfFirmadoE24Subido) {
                    <div class="stepper-upload-done">
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <div class="text-xs">
                          <span class="font-semibold text-green-700">PDF firmado subido</span>
                          <span class="text-gray-400 ml-1.5">{{ convInfo()?.fechaPdfFirmadoE24 | date:'dd/MM/yyyy HH:mm' }}</span>
                        </div>
                      </div>
                      <label class="stepper-btn stepper-btn--outline text-[11px] cursor-pointer mt-1.5">
                        Cambiar archivo
                        <input type="file" accept=".pdf" class="hidden"
                          (change)="onUploadPdfFirmado($event)"
                          [disabled]="subiendoPdf()">
                      </label>
                    </div>
                  } @else {
                    <label class="stepper-upload-zone cursor-pointer"
                      [class.opacity-60]="subiendoPdf()">
                      <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span class="text-xs font-semibold text-amber-700">
                        {{ subiendoPdf() ? 'Subiendo archivo...' : 'Haga clic para subir el PDF firmado' }}
                      </span>
                      <span class="text-[10px] text-gray-400">Firme con FIRMA ONPE y suba el archivo aquí (máx. 10 MB)</span>
                      <input type="file" accept=".pdf" class="hidden"
                        (change)="onUploadPdfFirmado($event)"
                        [disabled]="subiendoPdf()">
                    </label>
                  }
                </div>

                <!-- Paso 3: Publicar -->
                <div class="stepper-content">
                  <div class="flex items-center gap-3">
                    <button
                      (click)="publicarResultados()"
                      [disabled]="publicando() || !convInfo()?.pdfFirmadoE24Subido"
                      class="stepper-btn disabled:opacity-40"
                      [class.stepper-btn--blue]="convInfo()?.pdfFirmadoE24Subido"
                      [class.stepper-btn--gray]="!convInfo()?.pdfFirmadoE24Subido"
                      [title]="!convInfo()?.pdfFirmadoE24Subido ? 'Debe subir el PDF firmado antes de publicar' : 'Publicar resultados E24'"
                    >
                      {{ publicando() ? '⟳ Publicando...' : 'Publicar E24' }}
                    </button>
                    @if (!convInfo()?.pdfFirmadoE24Subido) {
                      <span class="text-[10px] text-gray-400 italic">Requiere PDF firmado (DS 065-2011-PCM)</span>
                    }
                  </div>
                </div>
              }

              <div class="mt-3 pt-3 border-t border-blue-100">
                <a [routerLink]="['/sistema/seleccion', idConv, 'codigos-anonimos']"
                   class="btn-secondary text-sm inline-block">
                  Continuar → E25 Códigos Anónimos
                </a>
              </div>
            }
          </div>
        }

        <!-- Tabla de evaluación -->
        <div class="card overflow-x-auto">
          <div class="px-3 py-2 border-b flex items-center justify-between">
            <p class="text-xs text-gray-500 font-semibold">
              {{ entradas().length }} postulante(s)
              {{ (modoResultados() || yaTodosEvaluados()) ? '— Resultados E24' : 'en estado VERIFICADO' }}
              @if (paginado()) {
                <span class="text-gray-400 font-normal">
                  · mostrando {{ entradasPagina().length }} por página
                </span>
              }
            </p>
            <div class="flex gap-4 text-xs">
              <span class="text-green-600 font-medium">≥ umbral: {{ aptosPreview() }}</span>
              <span class="text-red-500">&lt; umbral: {{ noAptosPreview() }}</span>
            </div>
          </div>

          <table class="w-full text-xs border-collapse">
            <thead>
              <!-- Fila 1: grupos (factores padre con colspan) -->
              <tr class="bg-[#1F2133] text-white">
                <th class="px-3 py-2 text-left font-semibold sticky left-0 bg-[#1F2133] z-10 min-w-[200px]"
                    rowspan="2">
                  Postulante
                </th>
                @for (padre of factoresPadre(); track padre.idFactor) {
                  <th
                    class="px-2 py-1 text-center font-semibold border-l border-blue-700"
                    [attr.colspan]="padre.subcriterios?.length || 1"
                  >
                    {{ padre.criterio }}
                    <span class="font-normal text-gray-300 text-xs ml-1">
                      (máx. {{ padre.puntajeMaximo }})
                    </span>
                  </th>
                }
                <th class="px-3 py-1 text-center font-semibold min-w-[70px] bg-[#0F3460]"
                    rowspan="2">Total</th>
                <th class="px-3 py-1 text-center font-semibold min-w-[85px] bg-[#0F3460]"
                    rowspan="2">Estado</th>
                <th class="px-3 py-1 text-center font-semibold min-w-[220px] bg-[#0F3460]"
                    rowspan="2">Observaciones</th>
              </tr>
              <!-- Fila 2: subcriterios con puntaje máximo -->
              <tr class="bg-[#2D3250] text-white">
                @for (padre of factoresPadre(); track padre.idFactor) {
                  @for (sub of (padre.subcriterios || []); track sub.idFactor) {
                    <th class="px-2 py-1 text-center font-normal min-w-[100px] border-l border-blue-800 text-gray-200">
                      {{ sub.criterio }}
                      <br>
                      <span class="text-gray-400 text-xs">(máx. {{ sub.puntajeMaximo }})</span>
                    </th>
                  }
                }
              </tr>
            </thead>
            <tbody>
              @for (e of entradasPagina(); track e.idPostulacion; let i = $index) {
                <!-- Fila de puntajes -->
                <tr
                  class="border-t transition-colors"
                  [class]="i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'"
                >
                  <!-- Nombre + botón expandir docs -->
                  <td
                    class="px-3 py-2 sticky left-0 z-10"
                    [class]="i % 2 === 0 ? 'bg-white' : 'bg-gray-50'"
                  >
                    <div class="flex items-center gap-2">
                      <button
                        (click)="toggleDocs(e)"
                        class="text-blue-500 hover:text-blue-700 text-sm font-bold
                               w-5 h-5 flex items-center justify-center rounded
                               hover:bg-blue-100 transition-colors flex-shrink-0"
                        [title]="e.expandido ? 'Ocultar documentos' : 'Ver documentos del expediente'"
                      >{{ e.expandido ? '▼' : '▶' }}</button>
                      <span class="font-medium text-xs">{{ e.nombre }}</span>
                    </div>
                  </td>

                  <!-- Inputs por subcriterio -->
                  @for (sub of e.subcriterios; track sub.idFactor) {
                    <td class="px-2 py-1 text-center border-l border-gray-100">
                      <input
                        type="number"
                        [(ngModel)]="sub.puntaje"
                        (ngModelChange)="onPuntajeChange(e)"
                        [min]="0"
                        [max]="sub.puntajeMaximo"
                        step="0.5"
                        [disabled]="modoLectura() || e.esNoApto"
                        class="w-20 text-center border rounded px-1 py-0.5 text-xs
                               focus:ring-1 focus:ring-blue-500 focus:outline-none
                               disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                        [class]="sub.puntaje > sub.puntajeMaximo
                          ? 'border-red-400 bg-red-50'
                          : sub.puntaje > 0
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-300'"
                        [attr.aria-label]="'Puntaje ' + sub.criterio + ' para ' + e.nombre"
                      />
                    </td>
                  }

                  <!-- Total -->
                  <td class="px-3 py-2 text-center font-bold text-sm">
                    {{ e.totalCache | number:'1.1-1' }}
                  </td>

                  <!-- Estado en tiempo real -->
                  <td class="px-3 py-2 text-center">
                    @if (e.esNoApto) {
                      <span class="text-xs font-semibold text-red-700
                                   bg-red-100 px-2 py-0.5 rounded-full">NO APTO</span>
                    } @else if (e.totalCache === 0) {
                      <span class="text-gray-300 text-xs">—</span>
                    } @else if (umbralEfectivo() > 0 && e.totalCache >= umbralEfectivo()) {
                      <span class="text-xs font-semibold text-green-700
                                   bg-green-100 px-2 py-0.5 rounded-full">APTO ✓</span>
                    } @else if (umbralEfectivo() > 0) {
                      <span class="text-xs font-semibold text-red-700
                                   bg-red-100 px-2 py-0.5 rounded-full">NO APTO</span>
                    }
                  </td>

                  <!-- Observación automática — solo para VERIFICADO (NO APTO), readonly, derivada de DL1451 + RF07 -->
                  <td class="px-2 py-1 align-top">
                    @if (e.esNoApto) {
                      <textarea
                        readonly
                        rows="2"
                        [value]="e.observacionNoApto"
                        [title]="e.observacionNoApto"
                        class="w-full text-xs bg-red-50 border border-red-200 text-red-700
                               rounded px-2 py-1 resize-none cursor-not-allowed leading-snug"
                      ></textarea>
                    }
                  </td>
                </tr>

                <!-- Fila expandible: documentos del expediente -->
                @if (e.expandido) {
                  <tr [class]="i % 2 === 0 ? 'bg-blue-50' : 'bg-blue-50'">
                    <td [attr.colspan]="colspanTotal()" class="px-4 py-3">
                      @if (e.cargandoDocs) {
                        <span class="text-xs text-gray-400">
                          <span class="animate-spin inline-block mr-1">⟳</span>
                          Cargando documentos...
                        </span>
                      } @else if (e.documentos.length === 0) {
                        <span class="text-xs text-gray-400 italic">
                          Este postulante no tiene documentos cargados en el expediente.
                        </span>
                      } @else {
                        <div class="flex flex-wrap gap-2">
                          @for (doc of e.documentos; track doc.idExpediente) {
                            <button
                              (click)="abrirDoc(e.idPostulacion, doc.idExpediente, doc.nombreArchivo)"
                              [disabled]="descargando() === doc.idExpediente"
                              class="flex items-center gap-1.5 text-xs bg-white border border-blue-200
                                     rounded px-2 py-1.5 hover:bg-blue-100 hover:border-blue-400
                                     transition-colors text-blue-700 font-medium disabled:opacity-50
                                     disabled:cursor-wait"
                              [title]="doc.nombreArchivo + ' · ' + doc.tamanoKb + ' KB'"
                            >
                              @if (descargando() === doc.idExpediente) {
                                <span class="animate-spin">⟳</span>
                              } @else {
                                <span>📄</span>
                              }
                              <span>{{ doc.tipoDocumento }}</span>
                              <span class="text-gray-400 font-normal text-xs">
                                {{ doc.tamanoKb }} KB
                              </span>
                            </button>
                          }
                        </div>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>

          <!-- Paginación -->
          @if (paginado()) {
            <div class="px-4 py-3 border-t flex items-center justify-between text-xs text-gray-500">
              <span>Página {{ currentPage() + 1 }} de {{ totalPaginas() }}</span>
              <div class="flex gap-2">
                <button
                  (click)="currentPage.set(currentPage() - 1)"
                  [disabled]="currentPage() === 0"
                  class="btn-ghost text-xs px-2 py-1 disabled:opacity-40"
                >← Anterior</button>
                <button
                  (click)="currentPage.set(currentPage() + 1)"
                  [disabled]="currentPage() >= totalPaginas() - 1"
                  class="btn-ghost text-xs px-2 py-1 disabled:opacity-40"
                >Siguiente →</button>
              </div>
            </div>
          }
        </div>

        <!-- Advertencia puntajes inválidos -->
        @if (hayPuntajeInvalido()) {
          <div class="card border border-red-300 bg-red-50 p-3 text-xs text-red-700">
            ⚠ Hay puntajes que superan el máximo permitido por criterio. Corrija antes de guardar.
          </div>
        }

        <!-- Acciones -->
        <div class="flex gap-2 justify-end items-center">
          <a [routerLink]="['/sistema/seleccion', idConv, 'postulantes']"
             class="btn-ghost">← Volver</a>
          @if (modoLectura()) {
            <span class="text-xs text-gray-400 italic px-2">
              🔒 Modo lectura — evaluación ya registrada
            </span>
          } @else {
            <button
              (click)="evaluar()"
              [disabled]="enviando() || !puedeEnviar()"
              class="btn-primary disabled:opacity-50"
              [title]="!puedeEnviar() ? 'Complete el puntaje de todos los postulantes para continuar' : ''"
            >
              {{ enviando() ? '⟳ Registrando...' : 'Registrar Evaluación Curricular (E24)' }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class EvalCurricularComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esOrhOAdmin = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH']),
  );

  protected readonly esComiteOAdmin = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_COMITE']),
  );

  /**
   * Modo resultados: activado via queryParam ?resultados=1 desde postulantes.
   * Indica que E24 ya fue ejecutado y el COMITÉ/ORH quiere ver resultados, no re-evaluar.
   */
  protected readonly modoResultados = signal(
    this.route.snapshot.queryParamMap.get('resultados') === '1',
  );

  /**
   * true cuando todos los participantes cargados son APTO o NO_APTO
   * (ningún VERIFICADO) — protección adicional contra re-evaluación accidental.
   */
  protected readonly yaTodosEvaluados = computed(() => {
    const list = this.entradas();
    return list.length > 0 && list.every((e) => e.estado === 'APTO' || e.estado === 'NO_APTO');
  });

  /** Modo lectura: resultado en sesión actual, modo resultados explícito, o todos ya evaluados */
  protected readonly modoLectura = computed(
    () => this.resultado() !== null || this.modoResultados() || this.yaTodosEvaluados(),
  );

  readonly idConv = Number(this.route.snapshot.paramMap.get('id'));

  // ── Signals base ────────────────────────────────────────────────────────────
  readonly loading       = signal(true);
  readonly enviando      = signal(false);
  readonly publicando    = signal(false);
  readonly descargandoPdf = signal(false);
  readonly subiendoPdf    = signal(false);
  readonly entradas      = signal<EntradaEval[]>([]);
  readonly factoresPadre = signal<FactorDetalle[]>([]);
  readonly resultado     = signal<EvalCurricularResponse | null>(null);
  readonly currentPage   = signal(0);
  readonly descargando   = signal<number | null>(null);
  /** Info de convocatoria — cargada junto a postulantes para verificar resultadosCurricularPublicados */
  readonly convInfo      = signal<ConvocatoriaSeleccionItem | null>(null);

  /** Entradas elegibles para evaluación — excluye VERIFICADO (NO APTO) bloqueados */
  readonly entradasElegibles = computed(() =>
    this.entradas().filter(e => !e.esNoApto),
  );

  // ── Computed — umbral y máximo ──────────────────────────────────────────────
  readonly umbralEfectivo = computed(() => {
    const padres = this.factoresPadre();
    // El umbral es puntajeMinimo del PADRE (configurado por el Comité en E12)
    const sumMin = padres.reduce((acc, p) => acc + (p.puntajeMinimo ?? 0), 0);
    if (sumMin > 0) return sumMin;
    // Fallback: 60% del puntajeMaximo padre si no fue configurado
    const sumMax = padres.reduce((acc, p) => acc + (p.puntajeMaximo ?? 0), 0);
    return Math.round(sumMax * 0.60 * 10) / 10;
  });

  readonly puntajeMaximoTotal = computed(() =>
    this.factoresPadre().reduce((acc, padre) => {
      const subMax = (padre.subcriterios ?? []).reduce(
        (s, sub) => s + (sub.puntajeMaximo ?? 0), 0,
      );
      return acc + subMax;
    }, 0),
  );

  readonly subtitleDinamico = computed(() => {
    const umbral = this.umbralEfectivo();
    const max = this.puntajeMaximoTotal();
    if (umbral > 0 && max > 0) {
      return `E24 · RF-09 · Umbral: ${umbral} pts de ${max} pts máximos`;
    }
    return 'E24 · RF-09 · Evaluación por criterios configurados';
  });

  /** Total de columnas para colspan de la fila de documentos */
  readonly colspanTotal = computed(() => {
    const subTotal = this.factoresPadre().reduce(
      (acc, p) => acc + ((p.subcriterios ?? []).length || 1), 0,
    );
    return subTotal + 4; // +1 postulante sticky, +1 total, +1 estado, +1 observaciones
  });

  // ── Computed — progreso ─────────────────────────────────────────────────────
  // Computed de progreso — operan solo sobre entradas elegibles (excluyen NO APTO bloqueados)
  readonly evaluadosCount = computed(() =>
    this.entradasElegibles().filter((e) => e.totalCache > 0).length,
  );

  readonly progresoPct = computed(() => {
    const total = this.entradasElegibles().length;
    return total > 0 ? Math.round((this.evaluadosCount() / total) * 100) : 0;
  });

  readonly aptosPreview = computed(() =>
    this.umbralEfectivo() > 0
      ? this.entradasElegibles().filter((e) => e.totalCache >= this.umbralEfectivo()).length
      : 0,
  );

  readonly noAptosPreview = computed(() =>
    this.umbralEfectivo() > 0
      ? this.entradasElegibles().filter(
          (e) => e.totalCache > 0 && e.totalCache < this.umbralEfectivo(),
        ).length
      : 0,
  );

  readonly hayPuntajeInvalido = computed(() =>
    this.entradasElegibles().some((e) =>
      e.subcriterios.some((s) => s.puntaje > s.puntajeMaximo),
    ),
  );

  // ── Computed — paginación ───────────────────────────────────────────────────
  readonly paginado = computed(() => this.entradas().length > UMBRAL_PAGINADO);

  readonly totalPaginas = computed(() =>
    Math.ceil(this.entradas().length / PAGE_SIZE),
  );

  readonly entradasPagina = computed(() => {
    if (!this.paginado()) return this.entradas();
    const start = this.currentPage() * PAGE_SIZE;
    return this.entradas().slice(start, start + PAGE_SIZE);
  });

  readonly puedeEnviar = computed(() =>
    !this.enviando() &&
    !this.hayPuntajeInvalido() &&
    this.entradasElegibles().length > 0 &&
    this.evaluadosCount() === this.entradasElegibles().length,
  );

  constructor() {
    this.cargar();
  }

  /** Recalcula totalCache y dispara change detection OnPush */
  protected onPuntajeChange(entrada: EntradaEval): void {
    entrada.totalCache = entrada.subcriterios.reduce(
      (acc, s) => acc + (Number(s.puntaje) || 0),
      0,
    );
    this.entradas.set([...this.entradas()]);
  }

  /** Expande/colapsa la fila de documentos y los carga lazy */
  protected toggleDocs(entrada: EntradaEval): void {
    entrada.expandido = !entrada.expandido;
    if (entrada.expandido && entrada.documentos.length === 0 && !entrada.cargandoDocs) {
      entrada.cargandoDocs = true;
      this.entradas.set([...this.entradas()]);
      this.svc
        .listarExpedientePostulante(entrada.idPostulacion)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (docs) => {
            entrada.documentos = docs;
            entrada.cargandoDocs = false;
            this.entradas.set([...this.entradas()]);
          },
          error: () => {
            entrada.cargandoDocs = false;
            this.entradas.set([...this.entradas()]);
          },
        });
    } else {
      this.entradas.set([...this.entradas()]);
    }
  }

  /** Descarga el archivo via HttpClient (con JWT) y lo abre en nueva pestaña */
  protected abrirDoc(idPost: number, idExp: number, nombreArchivo: string): void {
    if (this.descargando() === idExp) return;
    this.descargando.set(idExp);

    this.svc
      .descargarExpedienteBlob(idPost, idExp)
      .pipe(take(1))
      .subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          window.open(objectUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
          this.descargando.set(null);
        },
        error: () => {
          this.toast.error(`No se pudo abrir el documento: ${nombreArchivo}`);
          this.descargando.set(null);
        },
      });
  }

  private cargar(): void {
    forkJoin({
      postulantes: this.svc.listarPostulantes(this.idConv, 0, 200),
      factores: this.svc.listarFactores(this.idConv),
      convocatoria: this.svc.obtenerConvocatoria(this.idConv),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ postulantes, factores, convocatoria }) => {
          this.convInfo.set(convocatoria);
          // Solo factores CURRICULAR padre (subcriterios vienen anidados)
          const padres = factores.filter(
            (f) => f.etapaEvaluacion === 'CURRICULAR' && !f.idFactorPadre,
          );
          this.factoresPadre.set(padres);

          // Aplanar subcriterios para los inputs
          const subcritFlat: SubcriterioEval[] = padres.flatMap((padre) =>
            (padre.subcriterios ?? []).map((sub) => ({
              idFactor: sub.idFactor,
              criterio: sub.criterio,
              puntaje: 0,
              puntajeMaximo: sub.puntajeMaximo ?? 100,
              puntajeMinimo: sub.puntajeMinimo ?? 0,
              idPadre: padre.idFactor,
            })),
          );

          /**
           * En modo resultados (queryParam ?resultados=1) se incluyen APTO y NO_APTO
           * para que COMITÉ/ORH puedan consultar los resultados de E24.
           * En modo normal solo se cargan VERIFICADO (lógica original intacta).
           */
          const enModoResultados = this.modoResultados();
          // En modoResultados: incluye TODOS los estados post-E24 (también GANADOR/ACCESITARIO/
          // NO_SELECCIONADO/DESCALIFICADO) para que los resultados sean perennes sin importar
          // qué etapas posteriores (E26-E31) se hayan ejecutado.
          const ESTADOS_POST_E24 = ['VERIFICADO', 'APTO', 'NO_APTO', 'GANADOR', 'ACCESITARIO', 'NO_SELECCIONADO', 'DESCALIFICADO'];
          const paraEvaluar = postulantes.content.filter(
            (p: PostulacionSeleccion) =>
              enModoResultados
                ? ESTADOS_POST_E24.includes(p.estado)
                : p.estado === 'VERIFICADO',
          );

          this.entradas.set(
            paraEvaluar.map((p: PostulacionSeleccion) => {
              // Derivar esNoApto desde flags DL1451 + RF07 ya persistidos en BD
              const conSanciones = p.verificacionRnssc === 'CON_SANCIONES'
                                || p.verificacionRegiprec === 'CON_SANCIONES';
              const esNoApto = p.estado === 'VERIFICADO'
                            && (conSanciones || p.admisionRf07 === 'NO_ADMITIDO');
              return {
                idPostulacion: p.idPostulacion,
                nombre: p.postulante.nombreCompleto,
                /**
                 * Para APTO/NO_APTO: pre-poblar con puntajeCurricular registrado.
                 * Para VERIFICADO elegible: 0 (aún sin evaluar).
                 * Para VERIFICADO NO APTO: 0 (inputs bloqueados, no se evalúan).
                 */
                // Usar puntajeCurricular para todos los estados que ya pasaron por E24
                // (APTO, NO_APTO, y estados post-E31). Se preserva el valor original
                // registrado en TBL_POSTULACION — nunca es sobreescrito por etapas posteriores.
                totalCache: p.puntajeCurricular != null ? p.puntajeCurricular : 0,
                estado: p.estado,
                expandido: false,
                documentos: [],
                cargandoDocs: false,
                subcriterios: subcritFlat.map((s) => {
                  const evalBD = p.evaluacionesCurriculares?.find(
                    (e) => e.idFactor === s.idFactor,
                  );
                  return { ...s, puntaje: evalBD ? Number(evalBD.puntajeObtenido) : 0 };
                }),
                esNoApto,
                observacionNoApto: esNoApto ? observacionParaNoApto(p) : '',
              };
            }),
          );
          this.loading.set(false);
        },
        error: () => {
          this.toast.error('No se pudo cargar los datos de evaluación.');
          this.loading.set(false);
        },
      });
  }

  /** Re-descarga el PDF ya publicado (GET — no modifica estado) */
  protected descargarResultados(): void {
    if (this.descargandoPdf()) return;
    this.descargandoPdf.set(true);
    this.svc
      .resultadosCurricularPdf(this.idConv)
      .pipe(take(1))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `RESULT-CURRICULAR-CONV-${this.idConv}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          this.descargandoPdf.set(false);
        },
        error: () => {
          this.descargandoPdf.set(false);
          this.toast.error('No se pudo descargar el PDF de resultados E24.');
        },
      });
  }

  /** Publica (primera vez) y descarga el PDF de resultados curriculares (E24-PDF) */
  protected publicarResultados(): void {
    if (this.publicando()) return;
    this.publicando.set(true);
    this.svc
      .publicarResultadosCurricular(this.idConv)
      .pipe(take(1))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `RESULT-CURRICULAR-CONV-${this.idConv}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          this.publicando.set(false);
          this.convInfo.update(c => c ? { ...c, resultadosCurricularPublicados: true } : c);
          this.toast.success('Resultados E24 publicados. PDF descargado.');
        },
        error: () => {
          this.publicando.set(false);
          this.toast.error('No se pudo publicar los resultados E24.');
        },
      });
  }

  /** Sube el PDF firmado digitalmente por ORH (DS 065-2011-PCM) */
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
      this.toast.error('El archivo excede el límite de 10 MB.');
      input.value = '';
      return;
    }
    this.subiendoPdf.set(true);
    this.svc.uploadPdfFirmadoE24(this.idConv, file)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.subiendoPdf.set(false);
          this.convInfo.update(c => c ? {
            ...c,
            pdfFirmadoE24Subido: true,
            fechaPdfFirmadoE24: res.fechaSubida,
          } : c);
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

  protected evaluar(): void {
    if (!this.puedeEnviar()) return;

    this.enviando.set(true);

    const req = {
      // Se envían TODAS las entradas: elegibles con su puntaje + NO APTO con puntaje=0
      // → backend transiciona VERIFICADO (NO APTO) a NO_APTO, conteos correctos en respuesta
      evaluaciones: this.entradas().map((e) => ({
        idPostulacion: e.idPostulacion,
        factores: e.subcriterios.map((s) => ({
          idFactor: s.idFactor,
          puntaje: e.esNoApto ? 0 : Number(s.puntaje),
          observacion: '',
        })),
      })),
    };

    this.svc
      .evalCurricular(this.idConv, req as Parameters<typeof this.svc.evalCurricular>[1])
      .pipe(
        timeout(20000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.resultado.set(res);
          this.toast.success(
            `Evaluación registrada: ${res?.totalAptos ?? 0} APTOS, ${res?.totalNoAptos ?? 0} NO APTOS`,
          );
        },
        error: (err: unknown) => {
          if (err instanceof TimeoutError) {
            this.toast.error('El servidor tardó demasiado en responder. Revise el backend.');
          } else {
            this.toast.error('Error al registrar la evaluación curricular.');
          }
        },
      });
  }
}
