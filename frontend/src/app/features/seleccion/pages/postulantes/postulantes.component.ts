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
import { DecimalPipe } from '@angular/common';
import { SeleccionService } from '../../services/seleccion.service';
import { ToastService } from '@core/services/toast.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '@shared/components/status-badge/status-badge.component';
import { PostulacionSeleccion, ConvocatoriaSeleccionItem } from '../../models/seleccion.model';
import { FormsModule } from '@angular/forms';

const ESTADO_ORDEN: Record<string, number> = {
  REGISTRADO: 0, VERIFICADO: 1, APTO: 2, NO_APTO: 3,
  DESCALIFICADO: 4, GANADOR: 5, ACCESITARIO: 6, NO_SELECCIONADO: 7,
};

/**
 * Determina el estado de verificación D.L.1451 de un postulante
 * usando los flags del backend, NO el estado de la postulación.
 */
function estadoDl1451(p: PostulacionSeleccion): 'pendiente' | 'ok' | 'con_sanciones' {
  const rnssc = p.verificacionRnssc;
  const regiprec = p.verificacionRegiprec;
  if (!rnssc && !regiprec) return 'pendiente';
  if (rnssc === 'CON_SANCIONES' || regiprec === 'CON_SANCIONES') return 'con_sanciones';
  return 'ok';
}

/**
 * Deriva el label visual de la columna ESTADO según DL1451 + RF07.
 * Solo aplica a VERIFICADO — el resto retorna el estado raw.
 *
 * Reglas:
 *  CON_SANCIONES                → VERIFICADO (NO APTO)  [auto-transicionado por E19]
 *  SIN_SANCIONES + NO_ADMITIDO  → VERIFICADO (NO APTO)
 *  SIN_SANCIONES + ADMITIDO     → VERIFICADO (APTO)
 *  SIN_SANCIONES + RF07 null    → VERIFICADO             [RF07 pendiente]
 */
function etiquetaEstadoDisplay(p: PostulacionSeleccion): string {
  if (p.estado !== 'VERIFICADO') return p.estado;
  if (estadoDl1451(p) === 'con_sanciones')  return 'VERIFICADO (NO APTO)';
  if (p.admisionRf07 === 'NO_ADMITIDO')     return 'VERIFICADO (NO APTO)';
  if (p.admisionRf07 === 'ADMITIDO')        return 'VERIFICADO (APTO)';
  return 'VERIFICADO';
}

/** Determina la etapa actual del proceso basándose en la distribución de estados */
function etapaActual(contadores: { estado: string; total: number }[]): string {
  const estados = new Set(contadores.map((c) => c.estado));
  if (estados.has('GANADOR') || estados.has('NO_SELECCIONADO')) return 'RESULTADO';
  if (estados.has('APTO') && contadores.find((c) => c.estado === 'APTO')!?.total > 0) {
    return 'EVALUACION';
  }
  if (estados.has('VERIFICADO')) return 'FILTRADO';
  if (estados.has('REGISTRADO')) return 'REGISTRO';
  return 'REGISTRO';
}

@Component({
  selector: 'app-postulantes',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, StatusBadgeComponent, DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <app-page-header
        [title]="convInfo() ? (convInfo()!.numeroConvocatoria + ' — ' + (convInfo()!.nombrePuesto || convInfo()!.objetoContratacion || '')) : 'Postulantes — Conv. #' + idConv"
        subtitle="E23 · Statechart de postulación · Flujo de evaluación">
        <a routerLink="/sistema/seleccion" class="btn-ghost text-sm">← Selección</a>
      </app-page-header>

      <!-- Statechart visual — progreso por etapa -->
      @if (contadores().length > 0) {
        <div class="card space-y-3">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Statechart — Distribución de postulantes
          </p>
          <!-- Stepper de etapas -->
          <div class="flex flex-wrap items-center gap-1 text-xs">
            @for (etapa of etapasFlow; track etapa.key) {
              <div class="flex items-center gap-1">
                <div class="flex items-center gap-1.5 px-2 py-1 rounded-full border"
                     [class]="etapaActualKey() === etapa.key
                       ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] font-semibold'
                       : etapaPasada(etapa.key)
                       ? 'bg-green-100 text-green-700 border-green-300'
                       : 'bg-gray-100 text-gray-400 border-gray-200'">
                  <span>{{ etapa.icon }}</span>
                  <span>{{ etapa.label }}</span>
                </div>
                @if (!$last) {
                  <span class="text-gray-300">→</span>
                }
              </div>
            }
          </div>

          <!-- Badges de conteo por estado -->
          <div class="flex flex-wrap gap-2">
            @for (kv of contadores(); track kv.estado) {
              <div class="flex items-center gap-1.5 px-2 py-1 rounded border text-xs"
                   [class]="colorBorderEstado(kv.estado)">
                <span class="font-bold text-sm" [class]="colorTextoEstado(kv.estado)">
                  {{ kv.total }}
                </span>
                <span class="text-gray-500">{{ kv.estado }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Panel de flujo con roles -->
      <div class="card border border-gray-200 bg-gray-50 space-y-3">
        <p class="text-xs text-gray-500 font-semibold uppercase tracking-wide">
          Flujo de Evaluación M03 — Acciones disponibles
        </p>
        <div class="flex flex-wrap gap-4">

          <!-- ① Verificación — ORH -->
          @if (esOrhOAdmin()) {
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-gray-500">① Verificación</span>
                <span class="badge-orh">ORH</span>
              </div>
              <div class="flex gap-1 flex-wrap">
                <a [routerLink]="['/sistema/seleccion', idConv, 'filtro']"
                   class="btn-ghost text-xs px-2 py-1">Ver detalle →</a>
              </div>
            </div>
          }

          <!-- ② Tachas — ORH -->
          @if (esOrhOAdmin()) {
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-gray-500">② Tachas (24h)</span>
                <span class="badge-orh">ORH</span>
              </div>
              <a [routerLink]="null"
                 class="btn-secondary text-xs px-2 py-1 inline-block opacity-40 cursor-not-allowed pointer-events-none">
                E22 — Resolver Tachas
              </a>
            </div>
          }

          <!-- ③ Evaluaciones — COMITÉ -->
          <div class="space-y-1">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-semibold text-gray-500">③ Evaluaciones</span>
              <span class="badge-comite">COMITÉ</span>
            </div>
            <div class="flex gap-1 flex-wrap">
              <!-- E24: navega siempre; con ?resultados=1 cuando ya fue ejecutado -->
              <a [routerLink]="['/sistema/seleccion', idConv, 'eval-curricular']"
                 [queryParams]="e24YaEjecutado() ? {resultados: '1'} : null"
                 class="btn-secondary text-xs px-2 py-1"
                 [class.opacity-40]="!hayAdmitidosParaE24() && !hayResultadosCurriculares()"
                 [class.cursor-not-allowed]="!hayAdmitidosParaE24() && !hayResultadosCurriculares()"
                 [class.pointer-events-none]="!hayAdmitidosParaE24() && !hayResultadosCurriculares()"
                 [title]="e24YaEjecutado() ? 'Ver resultados E24 — evaluación curricular ya registrada' : !hayAdmitidosParaE24() ? 'Requiere postulantes VERIFICADO y ADMITIDO en RF-07' : 'Registrar evaluación curricular'"
              >E24 Curricular</a>
              <!-- Resultados E24: visible a COMITÉ y ORH cuando los resultados curriculares fueron publicados — descarga PDF directamente -->
              @if (convInfo()?.resultadosCurricularPublicados && (esOrhOAdmin() || esComiteOAdmin())) {
                <button
                  (click)="descargarResultadosCurricular()"
                  [disabled]="descargandoCurricular()"
                  class="btn-secondary text-xs px-2 py-1 border-green-400 text-green-700
                         hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Descargar PDF de resultados de Evaluación Curricular (ya publicados)"
                >
                  @if (descargandoCurricular()) { ⟳ } @else { 📋 }
                  Resultados Curricular
                </button>
              }
              @if (esOrhOAdmin()) {
                <a [routerLink]="hayAptos() ? ['/sistema/seleccion', idConv, 'codigos-anonimos'] : null"
                   class="btn-secondary text-xs px-2 py-1"
                   [class.opacity-40]="!hayAptos()"
                   [class.cursor-not-allowed]="!hayAptos()"
                   [class.pointer-events-none]="!hayAptos()">
                  E25 Códigos <span class="text-orange-500 text-xs">(ORH)</span>
                </a>
              }
              <a [routerLink]="(todosAptosConCodigo() || convInfo()?.resultadosTecnicosPublicados) ? ['/sistema/seleccion', idConv, 'eval-tecnica'] : null"
                 class="btn-secondary text-xs px-2 py-1"
                 [class.opacity-40]="!todosAptosConCodigo() && !convInfo()?.resultadosTecnicosPublicados"
                 [class.cursor-not-allowed]="!todosAptosConCodigo() && !convInfo()?.resultadosTecnicosPublicados"
                 [class.pointer-events-none]="!todosAptosConCodigo() && !convInfo()?.resultadosTecnicosPublicados"
                 [title]="convInfo()?.resultadosTecnicosPublicados ? 'Ver resultados técnicos (solo lectura)' : !todosAptosConCodigo() ? 'Todos los APTO deben tener código anónimo (E25)' : 'Evaluación técnica anónima'"
              >E26 Técnica</a>
              <a [routerLink]="hayEvalTecnica() ? ['/sistema/seleccion', idConv, 'entrevista'] : null"
                 class="btn-secondary text-xs px-2 py-1"
                 [class.opacity-40]="!hayEvalTecnica()"
                 [class.cursor-not-allowed]="!hayEvalTecnica()"
                 [class.pointer-events-none]="!hayEvalTecnica()"
                 [title]="!hayEvalTecnica() ? 'Requiere evaluación técnica publicada (E26)' : 'Entrevista personal'"
              >E27 Entrevista</a>
            </div>
          </div>

          <!-- ④ Resultados — ORH -->
          @if (esOrhOAdmin()) {
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-gray-500">④ Resultados</span>
                <span class="badge-orh">ORH</span>
              </div>
              <div class="flex gap-1 flex-wrap">
                <!-- E27 Ver/Publicar — habilitado cuando COMITÉ notificó -->
                <a [routerLink]="hayEntrevistaNotificada() ? ['/sistema/seleccion', idConv, 'entrevista'] : null"
                   class="btn-secondary text-xs px-2 py-1"
                   [class.opacity-40]="!hayEntrevistaNotificada()"
                   [class.cursor-not-allowed]="!hayEntrevistaNotificada()"
                   [class.pointer-events-none]="!hayEntrevistaNotificada()"
                   [title]="!hayEntrevistaNotificada()
                     ? 'El COMITÉ debe notificar los resultados de Entrevista (E27) primero'
                     : hayEntrevistaPublicada()
                     ? 'E27 ya publicado — ver resultados'
                     : 'Ver y publicar resultados de Entrevista (E27)'"
                >
                  {{ hayEntrevistaPublicada() ? '✓ E27 Entrevista' : 'E27 Ver/Publicar' }}
                </a>
                <!-- E28 — habilitado cuando E27 publicado. OPCIONAL: solo si hay beneficiarios RF-15 -->
                <a [routerLink]="hayEntrevistaPublicada() ? ['/sistema/seleccion', idConv, 'bonificaciones'] : null"
                   class="btn-secondary text-xs px-2 py-1"
                   [class.opacity-40]="!hayEntrevistaPublicada()"
                   [class.cursor-not-allowed]="!hayEntrevistaPublicada()"
                   [class.pointer-events-none]="!hayEntrevistaPublicada()"
                   [title]="!hayEntrevistaPublicada() ? 'Publicar resultados de Entrevista (E27) primero' : hayBonificacionesCalculadas() ? '✓ E28 ya ejecutado' : 'Bonificaciones RF-15 (opcional)'"
                >{{ hayBonificacionesCalculadas() ? '✓ E28 Bonif.' : 'E28 Bonif.' }}</a>
                <!-- E29/E30 — habilitado cuando E27 publicado (E28 es opcional) -->
                <a [routerLink]="hayEntrevistaPublicada() ? ['/sistema/seleccion', idConv, 'cuadro-meritos'] : null"
                   class="btn-secondary text-xs px-2 py-1"
                   [class.opacity-40]="!hayEntrevistaPublicada()"
                   [class.cursor-not-allowed]="!hayEntrevistaPublicada()"
                   [class.pointer-events-none]="!hayEntrevistaPublicada()"
                   [title]="!hayEntrevistaPublicada() ? 'Publicar resultados de Entrevista (E27) primero' : hayResultadoFinal() ? '✓ Cuadro calculado — ver o recalcular' : 'Calcular Cuadro de Méritos RF-16'"
                >{{ hayResultadoFinal() ? '✓ E29/E30 Méritos' : 'E29/E30 Méritos' }}</a>
                <!-- E31 — activo solo cuando E29 ejecutado Y convocatoria no FINALIZADA -->
                @if (esFinalizada()) {
                  <span
                    class="text-xs px-2 py-1 rounded font-medium bg-red-600 text-white opacity-50 cursor-not-allowed"
                    title="Resultados ya publicados"
                  >✓ E31 Publicado</span>
                } @else {
                  <a [routerLink]="hayResultadoFinal() ? ['/sistema/seleccion', idConv, 'publicar'] : null"
                     class="text-xs px-2 py-1 rounded font-medium"
                     [class]="hayResultadoFinal()
                       ? 'bg-red-600 hover:bg-red-700 text-white'
                       : 'bg-red-600 text-white opacity-40 cursor-not-allowed pointer-events-none'"
                     [title]="!hayResultadoFinal() ? 'Calcular Cuadro de Méritos (E29) primero' : 'Publicar resultados finales E31'"
                  >E31 Publicar ⚡</a>
                }
              </div>
            </div>
          }

          <!-- ⑤ Comunicados — ORH (disponible en cualquier etapa, DS 083-2019-PCM Art.10) -->
          @if (esOrhOAdmin()) {
            <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-gray-500">⑤ Comunicados</span>
                <span class="badge-orh">ORH</span>
                <span class="text-xs text-gray-400 italic">DS 083-2019-PCM Art. 10</span>
              </div>
              <a [routerLink]="['/sistema/seleccion', idConv, 'comunicados']"
                 class="text-xs px-3 py-1.5 rounded-lg font-semibold bg-indigo-50 text-indigo-700
                        border border-indigo-200 hover:bg-indigo-100 transition-colors">
                📢 Ver / Publicar comunicados
              </a>
            </div>
          }
        </div>
      </div>

      <!-- Tabla de postulantes -->
      <div class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#1F2133] text-white">
              <th class="px-3 py-2 text-left text-xs font-semibold">#</th>
              <th class="px-3 py-2 text-left text-xs font-semibold">Apellidos y Nombres</th>
              <th class="px-3 py-2 text-left text-xs font-semibold">N° Documento</th>
              <th class="px-3 py-2 text-center text-xs font-semibold">Estado</th>
              <th class="px-3 py-2 text-center text-xs font-semibold">Cód. Anónimo</th>
              <th class="px-3 py-2 text-center text-xs font-semibold">P. Total</th>
              @if (esOrhOAdmin()) {
                <th class="px-3 py-2 text-center text-xs font-semibold">D.L.1451</th>
                <th class="px-3 py-2 text-center text-xs font-semibold">Filtro RF-07</th>
              }
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td [attr.colspan]="esOrhOAdmin() ? 8 : 6"
                    class="px-3 py-10 text-center text-gray-400">
                  <span class="animate-spin inline-block mr-2">⟳</span> Cargando...
                </td>
              </tr>
            } @else if (postulantes().length === 0) {
              <tr>
                <td [attr.colspan]="esOrhOAdmin() ? 8 : 6"
                    class="px-3 py-10 text-center text-gray-400">
                  No hay postulantes registrados para esta convocatoria.
                </td>
              </tr>
            } @else {
              @for (p of postulantes(); track p.idPostulacion; let i = $index) {
                <tr class="border-t hover:bg-gray-50 transition-colors">
                  <td class="px-3 py-2 text-gray-400 text-xs">{{ i + 1 }}</td>

                  <!-- BUG-1 FIX: postulante.nombreCompleto (campo real del backend) -->
                  <td class="px-3 py-2 font-medium text-sm">
                    {{ p.postulante.nombreCompleto || '(Sin nombre)' }}
                  </td>

                  <!-- BUG-1 FIX: postulante.numeroDocumento -->
                  <td class="px-3 py-2 text-gray-500 font-mono text-xs">
                    {{ p.postulante.numeroDocumento || '—' }}
                  </td>

                  <!-- Label derivado: VERIFICADO (APTO) / VERIFICADO (NO APTO) según DL1451+RF07 -->
                  <td class="px-3 py-2 text-center">
                    <app-status-badge [estado]="p.estado" [label]="etiquetaEstadoDisplay(p)" />
                  </td>

                  <td class="px-3 py-2 text-center font-mono text-xs text-blue-700">
                    {{ p.codigoAnonimo || '—' }}
                  </td>

                  <td class="px-3 py-2 text-center text-sm font-semibold">
                    @if (p.puntajeTotal !== null && p.puntajeTotal !== undefined) {
                      {{ p.puntajeTotal | number:'1.2-2' }}
                    } @else {
                      <span class="text-gray-300">—</span>
                    }
                  </td>

                  <!--
                    BUG-B FIX: La columna D.L.1451 usa los FLAGS (verificacionRnssc/Regiprec),
                    no el estado de la postulación. Solo visible para ORH/ADMIN.
                  -->
                  @if (esOrhOAdmin()) {
                    <td class="px-3 py-2 text-center">
                      <div class="flex items-center justify-center gap-1 flex-wrap">
                        @switch (estadoDl1451(p)) {
                          @case ('pendiente') {
                            <a
                              [routerLink]="['/sistema/seleccion', idConv, 'dl1451', p.idPostulacion]"
                              class="text-xs bg-amber-100 text-amber-800
                                     hover:bg-amber-200 px-2 py-0.5 rounded
                                     font-medium transition-colors"
                            >Verificar</a>
                          }
                          @case ('ok') {
                            <span class="text-xs text-green-600 font-semibold">SIN SANCIONES</span>
                            <a
                              [routerLink]="['/sistema/seleccion', idConv, 'dl1451', p.idPostulacion]"
                              class="text-xs text-gray-400 hover:text-blue-600 underline"
                              title="Editar verificación"
                            >Editar</a>
                          }
                          @case ('con_sanciones') {
                            <span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                              ✗ Sancionado
                            </span>
                          }
                        }
                        <!-- Reset visible para cualquier estado distinto de REGISTRADO -->
                        @if (p.estado !== 'REGISTRADO') {
                          <button
                            (click)="abrirRollback(p)"
                            class="text-xs bg-orange-100 text-orange-700
                                   hover:bg-orange-200 px-2 py-0.5 rounded
                                   font-medium transition-colors"
                            title="Rollback administrativo — reiniciar postulación a REGISTRADO"
                          >↩ Reset</button>
                        }
                      </div>
                    </td>

                    <!-- Columna Filtro RF-07 — individual por postulante -->
                    <td class="px-3 py-2 text-center">
                      @if (p.admisionRf07 === 'ADMITIDO') {
                        <!-- Ya admitido -->
                        <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                          ✓ Admitido
                        </span>
                      } @else if (p.admisionRf07 === 'NO_ADMITIDO') {
                        <!-- Ya rechazado -->
                        <span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                          ✗ No admitido
                        </span>
                      } @else if (p.estado === 'REGISTRADO' && estadoDl1451(p) === 'ok') {
                        <!-- REGISTRADO + DL1451 OK: mostrar botones RF-07 -->
                        <div class="flex items-center justify-center gap-1 flex-wrap">
                          <button
                            (click)="aplicarFiltro(p, 'ADMITIR')"
                            [disabled]="aplicandoFiltro() === p.idPostulacion"
                            class="text-xs bg-blue-100 text-blue-800
                                   hover:bg-blue-200 px-2 py-0.5 rounded
                                   font-medium transition-colors
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Admitir — REGISTRADO → VERIFICADO + habilita E24"
                          >
                            {{ aplicandoFiltro() === p.idPostulacion ? '⟳' : '✓ Admitir' }}
                          </button>
                          <button
                            (click)="aplicarFiltro(p, 'NO_ADMITIR')"
                            [disabled]="aplicandoFiltro() === p.idPostulacion"
                            class="text-xs bg-red-100 text-red-700
                                   hover:bg-red-200 px-2 py-0.5 rounded
                                   font-medium transition-colors
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                            title="No admitir — REGISTRADO → VERIFICADO, bloqueado de E24"
                          >
                            {{ aplicandoFiltro() === p.idPostulacion ? '⟳' : '✗ No Admitir' }}
                          </button>
                        </div>
                      } @else {
                        <!-- DL1451 pendiente o estado no permite acción -->
                        <span class="text-xs text-gray-300 cursor-not-allowed"
                              title="Primero complete la verificación D.L. 1451 (E19)">
                          🔒
                        </span>
                      }
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>

        @if (totalPages() > 1) {
          <div class="px-4 py-3 border-t flex items-center justify-between text-sm text-gray-500">
            <span>
              Página {{ currentPage() + 1 }} de {{ totalPages() }} ·
              {{ totalElements() }} postulante(s)
            </span>
            <div class="flex gap-2">
              <button
                (click)="irPagina(currentPage() - 1)"
                [disabled]="currentPage() === 0"
                class="btn-ghost text-xs px-2 py-1 disabled:opacity-40"
              >← Anterior</button>
              <button
                (click)="irPagina(currentPage() + 1)"
                [disabled]="currentPage() >= totalPages() - 1"
                class="btn-ghost text-xs px-2 py-1 disabled:opacity-40"
              >Siguiente →</button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Modal Rollback Administrativo -->
    @if (rollbackTarget()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
          <div class="flex items-start gap-3">
            <span class="text-2xl">⚠️</span>
            <div>
              <h2 class="text-base font-bold text-gray-800">Rollback Administrativo</h2>
              <p class="text-sm text-gray-500 mt-0.5">
                Se reiniciará la postulación de
                <strong>{{ rollbackTarget()!.postulante.nombreCompleto }}</strong>
                a estado <strong>REGISTRADO</strong>.
                Esta acción queda registrada en el log de auditoría.
              </p>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Sustento obligatorio
            </label>
            <textarea
              [(ngModel)]="rollbackSustento"
              rows="3"
              maxlength="500"
              placeholder="Describa la razón administrativa del rollback (mínimo 10 caracteres)..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2
                     text-sm focus:outline-none focus:ring-2 focus:ring-orange-400
                     resize-none"
            ></textarea>
            <p class="text-xs text-gray-400 text-right">{{ rollbackSustento.length }}/500</p>
          </div>

          <div class="flex gap-2 justify-end pt-1">
            <button
              (click)="cerrarRollback()"
              [disabled]="ejecutandoRollback()"
              class="btn-ghost disabled:opacity-50"
            >Cancelar</button>
            <button
              (click)="confirmarRollback()"
              [disabled]="ejecutandoRollback() || rollbackSustento.trim().length < 10"
              class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold
                     px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ ejecutandoRollback() ? '⟳ Ejecutando...' : '↩ Confirmar Rollback' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .badge-orh    { @apply text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-mono; }
    .badge-comite { @apply text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono; }
  `],
})
export class PostulantesComponent {
  protected readonly estadoDl1451 = estadoDl1451;
  protected readonly etiquetaEstadoDisplay = etiquetaEstadoDisplay;

  protected readonly etapasFlow = [
    { key: 'REGISTRO',   icon: '📝', label: 'Registro' },
    { key: 'FILTRADO',   icon: '🔍', label: 'Filtrado' },
    { key: 'EVALUACION', icon: '📊', label: 'Evaluación' },
    { key: 'RESULTADO',  icon: '🏆', label: 'Resultado' },
  ];

  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(SeleccionService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idConv = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly convInfo = signal<ConvocatoriaSeleccionItem | null>(null);
  protected readonly postulantes = signal<PostulacionSeleccion[]>([]);
  protected readonly loading = signal(true);
  protected readonly accionando = signal(false);
  protected readonly descargandoCurricular = signal(false);
  /** idPostulacion del postulante que está siendo procesado en RF-07 individual (null = ninguno) */
  protected readonly aplicandoFiltro = signal<number | null>(null);

  // ── Rollback administrativo ───────────────────────────────────────────────
  protected readonly rollbackTarget = signal<PostulacionSeleccion | null>(null);
  protected readonly ejecutandoRollback = signal(false);
  protected rollbackSustento = '';
  protected readonly currentPage = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);

  protected readonly esOrhOAdmin = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_ORH']),
  );

  protected readonly esComiteOAdmin = computed(() =>
    this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_COMITE']),
  );

  protected readonly hayRegistrados = computed(() =>
    this.postulantes().some((p) => p.estado === 'REGISTRADO'),
  );

  protected readonly hayAptos = computed(() =>
    this.postulantes().some((p) => p.estado === 'APTO'),
  );

  protected readonly hayVerificados = computed(() =>
    this.postulantes().some((p) => p.estado === 'VERIFICADO'),
  );

  /** Gate E24: solo pasan postulantes VERIFICADO + admisionRf07=ADMITIDO */
  protected readonly hayAdmitidosParaE24 = computed(() =>
    this.postulantes().some(
      (p) => p.estado === 'VERIFICADO' && p.admisionRf07 === 'ADMITIDO',
    ),
  );

  /** E24 ya ejecutado: existen postulantes APTO o NO_APTO */
  protected readonly hayResultadosCurriculares = computed(() =>
    this.postulantes().some((p) => p.estado === 'APTO' || p.estado === 'NO_APTO'),
  );

  /**
   * E24 completado: hay resultados curriculares Y no quedan VERIFICADO+ADMITIDO pendientes.
   * Usa hayAdmitidosParaE24 (no hayVerificados) para no bloquear cuando aún existen
   * VERIFICADO(NO_APTO) que no requieren evaluación adicional.
   */
  protected readonly e24YaEjecutado = computed(() =>
    this.hayResultadosCurriculares() && !this.hayAdmitidosParaE24(),
  );

  /** E26 habilitado: todos los APTO tienen código anónimo asignado */
  protected readonly todosAptosConCodigo = computed(() => {
    const aptos = this.postulantes().filter((p) => p.estado === 'APTO');
    return aptos.length > 0 && aptos.every((p) => !!p.codigoAnonimo);
  });

  /** E27 habilitado: algún APTO ya tiene puntaje técnico registrado */
  protected readonly hayEvalTecnica = computed(() =>
    this.postulantes().some(
      (p) => p.estado === 'APTO' && p.puntajeTecnica != null,
    ),
  );

  /** E28/E29/E31 habilitados: COMITÉ notificó a ORH que la entrevista está lista */
  protected readonly hayEntrevistaNotificada = computed(() =>
    this.convInfo()?.notificacionEntrevistaEnviada === true,
  );

  /** E28/E29/E31 habilitados: ORH ya publicó los resultados de entrevista (E27-PUBLICAR) */
  protected readonly hayEntrevistaPublicada = computed(() =>
    this.convInfo()?.entrevistaPublicada === true,
  );

  /** E28 ya ejecutado (informativo — E28 es opcional) */
  protected readonly hayBonificacionesCalculadas = computed(() =>
    this.convInfo()?.bonificacionesCalculadas === true,
  );

  /** E29 ya produjo resultados finales — derivado de postulantes cargados, sin API extra */
  protected readonly hayResultadoFinal = computed(() =>
    this.postulantes().some((p) =>
      ['GANADOR', 'ACCESITARIO', 'NO_SELECCIONADO'].includes(p.estado),
    ),
  );

  /** E31 ya ejecutado — convocatoria FINALIZADA, resultados publicados */
  protected readonly esFinalizada = computed(() =>
    this.convInfo()?.estado === 'FINALIZADA',
  );

  protected readonly contadores = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.postulantes()) {
      map.set(p.estado, (map.get(p.estado) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => (ESTADO_ORDEN[a[0]] ?? 99) - (ESTADO_ORDEN[b[0]] ?? 99))
      .map(([estado, total]) => ({ estado, total }));
  });

  protected readonly etapaActualKey = computed(() =>
    etapaActual(this.contadores()),
  );

  constructor() {
    this.cargar();
    this.svc.obtenerConvocatoria(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (conv) => this.convInfo.set(conv) });
  }

  protected etapaPasada(key: string): boolean {
    const order = ['REGISTRO', 'FILTRADO', 'EVALUACION', 'RESULTADO'];
    return order.indexOf(key) < order.indexOf(this.etapaActualKey());
  }

  private cargar(page = 0): void {
    this.loading.set(true);
    this.svc
      .listarPostulantes(this.idConv, page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pageData) => {
          this.postulantes.set(pageData.content ?? []);
          this.totalPages.set(pageData.totalPages ?? 0);
          this.totalElements.set(pageData.totalElements ?? 0);
          this.currentPage.set(pageData.number ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Error al cargar postulantes.');
        },
      });
  }

  protected irPagina(page: number): void {
    this.cargar(page);
  }

  protected filtroRequisitos(): void {
    this.accionando.set(true);
    this.svc
      .filtroRequisitos(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.accionando.set(false);
          // Backend retorna PostulacionResponse: { idConvocatoria, estado, mensaje }
          // Los campos totalInscritos/totalNoAptos están en el mensaje ya formateado
          this.toast.success(res.mensaje ?? 'Filtro RF-07 ejecutado. Convocatoria → EN_SELECCION.');
          this.cargar();
        },
        error: () => {
          this.accionando.set(false);
          this.toast.error('Error al ejecutar el filtro.');
        },
      });
  }

  protected aplicarFiltro(p: PostulacionSeleccion, decision: 'ADMITIR' | 'NO_ADMITIR'): void {
    if (this.aplicandoFiltro() !== null) return;
    this.aplicandoFiltro.set(p.idPostulacion);
    this.svc
      .aplicarFiltroIndividual(p.idPostulacion, decision)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.aplicandoFiltro.set(null);
          this.toast.success(res.mensaje ?? 'Filtro RF-07 aplicado.');
          this.cargar(this.currentPage());
        },
        error: () => {
          this.aplicandoFiltro.set(null);
          this.toast.error('Error al aplicar el filtro RF-07.');
        },
      });
  }

  protected abrirRollback(p: PostulacionSeleccion): void {
    this.rollbackSustento = '';
    this.rollbackTarget.set(p);
  }

  protected cerrarRollback(): void {
    this.rollbackTarget.set(null);
    this.rollbackSustento = '';
  }

  protected confirmarRollback(): void {
    const target = this.rollbackTarget();
    if (!target || this.rollbackSustento.trim().length < 10) return;

    this.ejecutandoRollback.set(true);
    this.svc
      .rollbackAdmin(target.idPostulacion, {
        estadoDestino: 'REGISTRADO',
        sustento: this.rollbackSustento.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ejecutandoRollback.set(false);
          this.cerrarRollback();
          this.toast.success('Rollback ejecutado. Postulación reiniciada a REGISTRADO.');
          this.cargar(this.currentPage());
        },
        error: () => {
          this.ejecutandoRollback.set(false);
          this.toast.error('Error al ejecutar el rollback. Intente nuevamente.');
        },
      });
  }

  protected descargarResultadosCurricular(): void {
    if (this.descargandoCurricular()) return;
    this.descargandoCurricular.set(true);
    this.svc.resultadosCurricularPdf(this.idConv)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `resultados-curricular-${this.idConv}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          this.descargandoCurricular.set(false);
        },
        error: () => {
          this.descargandoCurricular.set(false);
          this.toast.error('Error al descargar el PDF de resultados curriculares.');
        },
      });
  }

  protected colorBorderEstado(estado: string): string {
    const m: Record<string, string> = {
      REGISTRADO: 'border-gray-300', VERIFICADO: 'border-blue-400',
      APTO: 'border-green-500', NO_APTO: 'border-red-400',
      DESCALIFICADO: 'border-red-700', GANADOR: 'border-emerald-500',
      ACCESITARIO: 'border-teal-500', NO_SELECCIONADO: 'border-gray-200',
    };
    return m[estado] ?? 'border-gray-200';
  }

  protected colorTextoEstado(estado: string): string {
    const m: Record<string, string> = {
      REGISTRADO: 'text-gray-500', VERIFICADO: 'text-blue-600',
      APTO: 'text-green-700', NO_APTO: 'text-red-600',
      DESCALIFICADO: 'text-red-800', GANADOR: 'text-emerald-700',
      ACCESITARIO: 'text-teal-700', NO_SELECCIONADO: 'text-gray-400',
    };
    return m[estado] ?? 'text-gray-600';
  }
}
