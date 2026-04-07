import { Component, ChangeDetectionStrategy, DestroyRef, inject, computed, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { PerfilPuestoService } from './requerimiento/services/perfil-puesto.service';
import { RequerimientoService } from './requerimiento/services/requerimiento.service';
import { ConvocatoriaService } from './convocatoria/services/convocatoria.service';
import { AvisoBancoAreaResponse, ConvocatoriaResponse } from './convocatoria/models/convocatoria.model';
import { SeleccionService } from './seleccion/services/seleccion.service';
import { ConvocatoriaSeleccionItem } from './seleccion/models/seleccion.model';

@Component({
  selector: 'app-sistema-dashboard',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hero Banner: gradiente CSS puro — sin imagen externa -->
    <div class="relative h-52 rounded-xl overflow-hidden mb-6 shadow-lg
                bg-gradient-to-r from-[#1F2133] via-[#243050] to-[#2D5F8A]">
      <!-- Contenido institucional -->
      <div class="h-full flex items-center px-8">
        <div class="flex items-center gap-5">
          <img src="/assets/images/logo.png" alt="ACFFAA"
               class="w-14 h-14 rounded-full border-2 border-[#D4A843]/70 object-cover shadow-lg shrink-0">
          <div>
            <p class="text-[#D4A843] text-xs font-semibold uppercase tracking-widest mb-1">
              ACFFAA · Régimen CAS
            </p>
            <h1 class="text-white font-bold text-2xl leading-tight">
              {{ greeting() }}, {{ firstName() }}
            </h1>
            <p class="text-white/55 text-sm mt-1">
              Sistema de Convocatorias a Puestos Laborales
            </p>
          </div>
        </div>
      </div>
      <!-- Franja dorada institucional inferior -->
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-[#D4A843]"></div>
      <!-- Detalle decorativo derecho -->
      <div class="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#D4A843]/10 to-transparent pointer-events-none"></div>
    </div>

    <!-- Acceso rápido por módulo -->
    <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-0.5">
      Acceso rápido
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">

      @if (canRequerimiento()) {
        <div class="flex flex-col gap-3 min-w-0">
        <a [routerLink]="requerimientoLink()"
           class="card group flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 hover:border-[#D4A843]/50 transition-all duration-200 cursor-pointer">
          <div class="w-10 h-10 bg-[#1F2133]/8 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-[#1F2133]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          </div>

          <!-- Badges de alertas — apilados verticalmente, ancho completo -->
          @if (isOrh() && perfilesPendientes() > 0) {
            <a routerLink="/sistema/requerimiento/perfiles"
               (click)="$event.stopPropagation()"
               class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-amber-50 border-l-2 border-amber-400 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
              <span class="text-[10px] font-semibold leading-snug">{{ perfilesPendientes() }} perfil{{ perfilesPendientes() !== 1 ? 'es' : '' }} por validar y aprobar</span>
              <span class="text-[10px] ml-1 opacity-60">→</span>
            </a>
          }
          @if (isOrh() && reqPendientesReglas() > 0) {
            <a routerLink="/sistema/requerimiento/requerimientos"
               (click)="$event.stopPropagation()"
               class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-indigo-50 border-l-2 border-indigo-400 text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer">
              <span class="text-[10px] font-semibold leading-snug">{{ reqPendientesReglas() }} req{{ reqPendientesReglas() !== 1 ? 's' : '' }}. por configurar motor de reglas</span>
              <span class="text-[10px] ml-1 opacity-60">→</span>
            </a>
          }
          @if (isOrh() && reqConfSinConv() > 0) {
            <a routerLink="/sistema/requerimiento/requerimientos"
               (click)="$event.stopPropagation()"
               class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-blue-50 border-l-2 border-blue-400 text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer">
              <span class="text-[10px] font-semibold leading-snug">{{ reqConfSinConv() }} req{{ reqConfSinConv() !== 1 ? 's' : '' }}. por crear Convocatoria CAS</span>
              <span class="text-[10px] ml-1 opacity-60">→</span>
            </a>
          }
          @if (isAreaSolicitante() && perfilesPendientesReq() > 0) {
            <a routerLink="/sistema/requerimiento/perfiles"
               (click)="$event.stopPropagation()"
               class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-amber-50 border-l-2 border-amber-400 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
              <span class="text-[10px] font-semibold leading-snug">{{ perfilesPendientesReq() }} perfil{{ perfilesPendientesReq() !== 1 ? 'es' : '' }} aprobado{{ perfilesPendientesReq() !== 1 ? 's' : '' }} por requerimiento</span>
              <span class="text-[10px] ml-1 opacity-60">→</span>
            </a>
          }
          @if (isOpp() && reqPendientesPresp() > 0) {
            <a routerLink="/sistema/requerimiento/requerimientos"
               (click)="$event.stopPropagation()"
               class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-amber-50 border-l-2 border-amber-400 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
              <span class="text-[10px] font-semibold leading-snug">{{ reqPendientesPresp() }} req{{ reqPendientesPresp() !== 1 ? 's' : '' }}. por verificación presupuestal</span>
              <span class="text-[10px] ml-1 opacity-60">→</span>
            </a>
          }
          <div>
            <h3 class="font-semibold text-sm text-gray-800">Requerimientos</h3>
            <p class="text-xs text-gray-500 mt-0.5">Perfiles y requerimientos CAS</p>
          </div>
          <span class="text-xs text-[#1F2133] font-medium mt-auto group-hover:text-[#D4A843] transition-colors">
            Ir al módulo →
          </span>
        </a>
        </div>
      }

      @if (canConvocatoria()) {
        <a routerLink="/sistema/convocatoria"
           class="card group flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 hover:border-[#D4A843]/50 transition-all duration-200 cursor-pointer">
          <div class="w-10 h-10 bg-[#1F2133]/8 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-[#1F2133]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
            </svg>
          </div>
          @if (isOrh() && convPendientesPublicar() > 0) {
            <a routerLink="/sistema/convocatoria"
               (click)="$event.stopPropagation()"
               class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-green-50 border-l-2 border-green-500 text-green-800 hover:bg-green-100 transition-colors cursor-pointer">
              <span class="text-[10px] font-semibold leading-snug">{{ convPendientesPublicar() }} convocatoria{{ convPendientesPublicar() !== 1 ? 's' : '' }} lista{{ convPendientesPublicar() !== 1 ? 's' : '' }} para publicar</span>
              <span class="text-[10px] ml-1 opacity-60">→</span>
            </a>
          }
          @if (isOrhOrAdmin() && pendientesNotificarComiteOrh().length > 0) {
            @for (c of pendientesNotificarComiteOrh(); track c.idConvocatoria) {
              <a [routerLink]="['/sistema/convocatoria', c.idConvocatoria, 'comite']"
                 (click)="$event.stopPropagation()"
                 class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-rose-50 border-l-2 border-rose-500 text-rose-900 hover:bg-rose-100 transition-colors cursor-pointer">
                <span class="text-[10px] font-semibold leading-snug">
                  {{ c.numeroConvocatoria }} — Falta «Notificar a Comité» (ORH)
                </span>
                <span class="text-[10px] ml-1 opacity-60">→</span>
              </a>
            }
          }
          @if (isComite() && convPendientesComite() > 0) {
            <a routerLink="/sistema/convocatoria"
               (click)="$event.stopPropagation()"
               class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-amber-50 border-l-2 border-amber-400 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
              <span class="text-[10px] font-semibold leading-snug">{{ convPendientesComite() }} convocatoria{{ convPendientesComite() !== 1 ? 's' : '' }} con tareas pendientes</span>
              <span class="text-[10px] ml-1 opacity-60">→</span>
            </a>
          }
          <div>
            <h3 class="font-semibold text-sm text-gray-800">Convocatorias</h3>
            <p class="text-xs text-gray-500 mt-0.5">Gestión de convocatorias CAS</p>
          </div>
          <span class="text-xs text-[#1F2133] font-medium mt-auto group-hover:text-[#D4A843] transition-colors">
            Ir al módulo →
          </span>
        </a>
      }

      @if (canSeleccion()) {
        <a routerLink="/sistema/seleccion"
           class="card group flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 hover:border-[#D4A843]/50 transition-all duration-200 cursor-pointer">
          <div class="w-10 h-10 bg-[#1F2133]/8 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-[#1F2133]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          @if (isOrh()) {
            @for (c of bancoCargadoPendienteOrh(); track c.idConvocatoria) {
              <div (click)="$event.stopPropagation(); $event.preventDefault()"
                   class="flex items-start gap-2 w-full px-2.5 py-2 rounded-md bg-teal-50 border-l-2 border-teal-500 text-teal-900 cursor-default select-text">
                <svg class="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/>
                </svg>
                <span class="text-[10px] font-medium leading-snug">
                  {{ c.numeroConvocatoria }} — El banco de preguntas fue cargado por el área solicitante. Estará disponible para configurar el Examen Virtual cuando la convocatoria pase a estado <strong>EN_SELECCION</strong>.
                </span>
              </div>
            }
            @for (c of pendientesE19(); track c.idConvocatoria) {
              <a [routerLink]="['/sistema/seleccion', c.idConvocatoria, 'postulantes']"
                 (click)="$event.stopPropagation()"
                 class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-amber-50 border-l-2 border-amber-400 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
                <span class="text-[10px] font-semibold leading-snug">
                  {{ c.numeroConvocatoria }} — {{ c.postulantesRegistrados }} postulante{{ c.postulantesRegistrados !== 1 ? 's' : '' }} por verificar (E19)
                </span>
                <span class="text-[10px] ml-1 opacity-60">→</span>
              </a>
            }
            @for (c of pendientesPublicarE24(); track c.idConvocatoria) {
              <a [routerLink]="['/sistema/seleccion', c.idConvocatoria, 'eval-curricular']"
                 [queryParams]="{ resultados: 1 }"
                 (click)="$event.stopPropagation()"
                 class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-orange-50 border-l-2 border-orange-500 text-orange-800 hover:bg-orange-100 transition-colors cursor-pointer">
                <span class="text-[10px] font-semibold leading-snug">
                  {{ c.numeroConvocatoria }} — Pendiente publicar resultado eval. curricular (E24)
                </span>
                <span class="text-[10px] ml-1 opacity-60">→</span>
              </a>
            }
            @for (c of pendientesE25(); track c.idConvocatoria) {
              <a [routerLink]="['/sistema/seleccion', c.idConvocatoria, 'postulantes']"
                 (click)="$event.stopPropagation()"
                 class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-green-50 border-l-2 border-green-500 text-green-800 hover:bg-green-100 transition-colors cursor-pointer">
                <span class="text-[10px] font-semibold leading-snug">
                  {{ c.numeroConvocatoria }} — {{ c.postulantesAptos }} APTO{{ c.postulantesAptos !== 1 ? 's' : '' }} sin Código Anónimo (E25)
                </span>
                <span class="text-[10px] ml-1 opacity-60">→</span>
              </a>
            }
            @for (c of pendientesEntrevista(); track c.idConvocatoria) {
              <a [routerLink]="['/sistema/seleccion', c.idConvocatoria, 'postulantes']"
                 (click)="$event.stopPropagation()"
                 class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-purple-50 border-l-2 border-purple-400 text-purple-800 hover:bg-purple-100 transition-colors cursor-pointer">
                <span class="text-[10px] font-semibold leading-snug">
                  {{ c.numeroConvocatoria }} — Entrevista lista. Proceda con Bonificaciones → Publicar Resultados
                </span>
                <span class="text-[10px] ml-1 opacity-60">→</span>
              </a>
            }
          }
          @if (isComite()) {
            @for (c of pendientesE24(); track c.idConvocatoria) {
              <a [routerLink]="['/sistema/seleccion', c.idConvocatoria, 'postulantes']"
                 (click)="$event.stopPropagation()"
                 class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-amber-50 border-l-2 border-amber-400 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
                <span class="text-[10px] font-semibold leading-snug">
                  {{ c.numeroConvocatoria }} — {{ c.postulantesVerificados }} postulante{{ c.postulantesVerificados !== 1 ? 's' : '' }} listo{{ c.postulantesVerificados !== 1 ? 's' : '' }} para E24
                </span>
                <span class="text-[10px] ml-1 opacity-60">→</span>
              </a>
            }
            @for (a of avisosCodigosListos(); track a.idNotificacion) {
              <a [routerLink]="a.idConvocatoria ? ['/sistema/seleccion', a.idConvocatoria, 'postulantes'] : ['/sistema/seleccion']"
                 (click)="$event.stopPropagation()"
                 class="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md bg-blue-50 border-l-2 border-blue-400 text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer">
                <span class="text-[10px] font-semibold leading-snug">🔔 {{ a.asunto }}</span>
                <span class="text-[10px] ml-1 opacity-60">→</span>
              </a>
            }
          }
          <div>
            <h3 class="font-semibold text-sm text-gray-800">Selección</h3>
            <p class="text-xs text-gray-500 mt-0.5">Evaluación y selección de postulantes</p>
          </div>
          <span class="text-xs text-[#1F2133] font-medium mt-auto group-hover:text-[#D4A843] transition-colors">
            Ir al módulo →
          </span>
        </a>
      }

      @if (canContrato()) {
        <a routerLink="/sistema/contrato"
           class="card group flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 hover:border-[#D4A843]/50 transition-all duration-200 cursor-pointer">
          <div class="w-10 h-10 bg-[#1F2133]/8 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-[#1F2133]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-gray-800">Contratos</h3>
            <p class="text-xs text-gray-500 mt-0.5">Gestión de contratos CAS</p>
          </div>
          <span class="text-xs text-[#1F2133] font-medium mt-auto group-hover:text-[#D4A843] transition-colors">
            Ir al módulo →
          </span>
        </a>
      }

    </div>

    @if (isAreaSolicitante() && avisosBanco().length > 0) {
      <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-6 mb-3 px-0.5">
        Banco de Preguntas y Respuestas
      </h2>
      <div class="card">
        <table class="w-full text-sm text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-200 text-gray-600">
              <th scope="col" class="py-2 pr-3 font-medium whitespace-nowrap">Convocatoria CAS</th>
              <th scope="col" class="py-2 pr-3 font-medium">Estado</th>
              <th scope="col" class="py-2 font-medium whitespace-nowrap text-right w-24">Acción</th>
            </tr>
          </thead>
          <tbody>
            @for (row of avisosBancoPagina(); track row.idConvocatoria) {
              <tr class="border-b border-gray-100 last:border-0 align-top">
                <td class="py-2 pr-3 font-medium text-gray-800 whitespace-nowrap">{{ row.numeroConvocatoria }}</td>
                <td class="py-2 pr-3 text-gray-700">
                  @if (row.bancoCompleto) {
                    <span class="text-teal-800">Banco de preguntas y respuestas ya enviado a ORH</span>
                  } @else {
                    <span class="text-amber-900">Pendiente cargar banco de preguntas</span>
                  }
                </td>
                <td class="py-2 text-right whitespace-nowrap">
                  @if (row.bancoCompleto) {
                    <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-teal-100 text-teal-900" role="status">Enviado</span>
                  } @else {
                    <a [routerLink]="['/sistema/banco-preguntas', row.idConvocatoria]"
                       class="text-xs font-medium text-[#1F2133] hover:text-[#D4A843] underline">
                      Cargar
                    </a>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (avisosBanco().length > bancoPageSize) {
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 pt-2 border-t border-gray-100">
            <p class="text-xs text-gray-500">
              Mostrando {{ bancoRangoInicio() }}–{{ bancoRangoFin() }} de {{ avisosBanco().length }}
            </p>
            <div class="flex items-center gap-2">
              <button type="button"
                (click)="bancoPrevPage()"
                [disabled]="!bancoCanPrev()"
                [attr.aria-disabled]="!bancoCanPrev()"
                aria-label="Página anterior de avisos de banco"
                class="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700
                       disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
                Anterior
              </button>
              <span class="text-xs text-gray-500 tabular-nums">{{ bancoPageIndex() + 1 }} / {{ bancoTotalPages() }}</span>
              <button type="button"
                (click)="bancoNextPage()"
                [disabled]="!bancoCanNext()"
                [attr.aria-disabled]="!bancoCanNext()"
                aria-label="Página siguiente de avisos de banco de preguntas"
                class="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700
                       disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
                Siguiente
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class SistemaDashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly perfilSvc    = inject(PerfilPuestoService);
  private readonly reqSvc       = inject(RequerimientoService);
  private readonly convSvc      = inject(ConvocatoriaService);
  private readonly seleccionSvc = inject(SeleccionService);
  private readonly router       = inject(Router);
  private readonly destroyRef   = inject(DestroyRef);

  readonly pendientesE19         = signal<ConvocatoriaSeleccionItem[]>([]);
  readonly pendientesE24         = signal<ConvocatoriaSeleccionItem[]>([]);
  readonly pendientesE25         = signal<ConvocatoriaSeleccionItem[]>([]);
  readonly pendientesPublicarE24 = signal<ConvocatoriaSeleccionItem[]>([]);
  readonly pendientesEntrevista  = signal<ConvocatoriaSeleccionItem[]>([]);
  readonly avisosCodigosListos   = signal<{ idNotificacion: number; asunto: string; idConvocatoria: number | null; numeroConvocatoria: string | null }[]>([]);
  readonly avisosBanco = signal<AvisoBancoAreaResponse[]>([]);
  readonly bancoPageSize = 5;
  readonly bancoPageIndex = signal(0);
  readonly bancoCargadoPendienteOrh = signal<ConvocatoriaResponse[]>([]);
  readonly perfilesPendientes    = signal(0);
  readonly perfilesPendientesReq = signal(0);
  readonly reqPendientesPresp    = signal(0);
  readonly reqPendientesReglas   = signal(0);
  readonly reqConfSinConv        = signal(0);
  readonly convPendientesComite   = signal(0);
  readonly convPendientesPublicar = signal(0);
  /** Convocatorias EN_ELABORACION con comité registrado y pendiente notificación ORH. */
  readonly pendientesNotificarComiteOrh = signal<ConvocatoriaResponse[]>([]);

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly firstName = computed(() => {
    const nombre = this.auth.currentUser()?.nombreCompleto ?? 'Usuario';
    return nombre.split(' ')[0];
  });

  readonly isOrh             = computed(() => this.auth.hasRole('ROLE_ORH'));
  readonly isOrhOrAdmin = computed(() => this.auth.hasAnyRole(['ROLE_ORH', 'ROLE_ADMIN']));
  readonly isAreaSolicitante = computed(() => this.auth.hasRole('ROLE_AREA_SOLICITANTE'));
  readonly isOpp             = computed(() => this.auth.hasRole('ROLE_OPP'));
  readonly isComite          = computed(() => this.auth.hasRole('ROLE_COMITE'));

  readonly requerimientoLink = computed(() =>
    this.isOpp() ? '/sistema/requerimiento/requerimientos' : '/sistema/requerimiento'
  );

  readonly canRequerimiento = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_OPP', 'ROLE_AREA_SOLICITANTE']));
  readonly canConvocatoria = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_COMITE']));
  readonly canSeleccion = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH', 'ROLE_COMITE']));
  readonly canContrato = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH']));

  readonly avisosBancoPagina = computed(() => {
    const all = this.avisosBanco();
    const start = this.bancoPageIndex() * this.bancoPageSize;
    return all.slice(start, start + this.bancoPageSize);
  });

  readonly bancoTotalPages = computed(() => {
    const n = this.avisosBanco().length;
    return Math.max(1, Math.ceil(n / this.bancoPageSize));
  });

  readonly bancoRangoInicio = computed(() => {
    const n = this.avisosBanco().length;
    if (n === 0) return 0;
    return this.bancoPageIndex() * this.bancoPageSize + 1;
  });

  readonly bancoRangoFin = computed(() => {
    const n = this.avisosBanco().length;
    return Math.min((this.bancoPageIndex() + 1) * this.bancoPageSize, n);
  });

  readonly bancoCanPrev = computed(() => this.bancoPageIndex() > 0);

  readonly bancoCanNext = computed(() => this.bancoPageIndex() < this.bancoTotalPages() - 1);

  bancoPrevPage(): void {
    if (this.bancoPageIndex() > 0) this.bancoPageIndex.update(i => i - 1);
  }

  bancoNextPage(): void {
    if (this.bancoPageIndex() < this.bancoTotalPages() - 1) this.bancoPageIndex.update(i => i + 1);
  }

  /** Lista avisos banco (Área Solicitante); reutilizado al volver al dashboard tras cargar preguntas. */
  private cargarAvisosBancoArea(): void {
    this.convSvc.pendientesBanco().subscribe({
      next: res => {
        const list = res.data ?? [];
        this.avisosBanco.set(list);
        const tp = Math.max(1, Math.ceil(list.length / this.bancoPageSize));
        if (this.bancoPageIndex() >= tp) this.bancoPageIndex.set(0);
      },
      error: () => this.avisosBanco.set([]),
    });
  }

  ngOnInit(): void {
    if (this.isOrhOrAdmin()) {
      this.convSvc.listarPendientesNotificarComiteOrh().subscribe({
        next: res => this.pendientesNotificarComiteOrh.set(res.data ?? []),
        error: () => this.pendientesNotificarComiteOrh.set([]),
      });
    }
    if (this.isOrh()) {
      this.perfilSvc.contarPendientesValidarAprobar().subscribe({
        next: res => this.perfilesPendientes.set(res.data ?? 0),
        error: () => this.perfilesPendientes.set(0),
      });
      this.reqSvc.contarConPresupuestoPendientesReglas().subscribe({
        next: res => this.reqPendientesReglas.set(res.data ?? 0),
        error: () => this.reqPendientesReglas.set(0),
      });
      this.reqSvc.contarConfiguradosSinConvocatoria().subscribe({
        next: res => this.reqConfSinConv.set(res.data ?? 0),
        error: () => this.reqConfSinConv.set(0),
      });
      this.convSvc.contarPendientesPublicar().subscribe({
        next: res => this.convPendientesPublicar.set(res.data ?? 0),
        error: () => this.convPendientesPublicar.set(0),
      });
      this.seleccionSvc.listarPendientesE19().subscribe({
        next: lista => this.pendientesE19.set(lista),
        error: ()   => this.pendientesE19.set([]),
      });
      this.seleccionSvc.listarPendientesE25Orh().subscribe({
        next: lista => this.pendientesE25.set(lista),
        error: ()   => this.pendientesE25.set([]),
      });
      this.seleccionSvc.listarPendientesPublicarE24Orh().subscribe({
        next: lista => this.pendientesPublicarE24.set(lista),
        error: ()   => this.pendientesPublicarE24.set([]),
      });
      this.seleccionSvc.listarPendientesEntrevistaOrh().subscribe({
        next: lista => this.pendientesEntrevista.set(lista),
        error: ()   => this.pendientesEntrevista.set([]),
      });
      this.convSvc.listarBancoCargadoPendienteConfigOrh().subscribe({
        next: res => this.bancoCargadoPendienteOrh.set(res.data ?? []),
        error: () => this.bancoCargadoPendienteOrh.set([]),
      });
    }
    if (this.isAreaSolicitante()) {
      this.perfilSvc.contarPendientesRequerimiento().subscribe({
        next: res => this.perfilesPendientesReq.set(res.data ?? 0),
        error: () => this.perfilesPendientesReq.set(0),
      });
      this.cargarAvisosBancoArea();
      this.router.events
        .pipe(
          filter((e): e is NavigationEnd => e instanceof NavigationEnd),
          filter(e => e.urlAfterRedirects.split('?')[0] === '/sistema/dashboard'),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => this.cargarAvisosBancoArea());
    }
    if (this.isOpp()) {
      this.reqSvc.contarPendientesVerificacionPresupuestal().subscribe({
        next: res => this.reqPendientesPresp.set(res.data ?? 0),
        error: () => this.reqPendientesPresp.set(0),
      });
    }
    if (this.isComite()) {
      this.convSvc.contarPendientesComite().subscribe({
        next: res => this.convPendientesComite.set(res.data ?? 0),
        error: () => this.convPendientesComite.set(0),
      });
      this.seleccionSvc.listarPendientesE24Comite().subscribe({
        next: lista => this.pendientesE24.set(lista),
        error: ()   => this.pendientesE24.set([]),
      });
      this.seleccionSvc.listarAvisosCodigosListos().subscribe({
        next: lista => this.avisosCodigosListos.set(lista),
        error: ()   => this.avisosCodigosListos.set([]),
      });
    }
  }
}
