import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';

import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

function mayorDeEdadValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  const nacimiento = new Date(value);
  if (isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  const cumple18 = new Date(nacimiento.getFullYear() + 18, nacimiento.getMonth(), nacimiento.getDate());
  return cumple18 <= hoy ? null : { menorDeEdad: true };
}
import { PostulantePerfilService } from '@core/services/postulante-perfil.service';
import { ToastService } from '@core/services/toast.service';
import { UbigeoService } from '@core/services/ubigeo.service';
import {
  PostulantePerfil,
  ActualizarPerfilPostulanteRequest,
} from '@shared/models/postulante-perfil.model';
import {
  UbigeoDepartamento,
  UbigeoProvincia,
  UbigeoDistrito,
} from '@shared/models/ubigeo.model';
import { MiPerfilFormacionAcademicaComponent } from './sections/mi-perfil-formacion-academica.component';
import { MiPerfilConocimientosComponent } from './sections/mi-perfil-conocimientos.component';
import { MiPerfilExperienciaComponent } from './sections/experiencia//mi-perfil-experiencia.component';
import { MiPerfilDocumentosComponent } from './sections/documentos/mi-perfil-documentos.component';
import { MiPerfilVistaPreviaComponent } from './sections/vista-previa/mi-perfil-vista-previa.component';
type MiPerfilSectionKey =
  | 'datos'
  | 'formacion'
  | 'conocimientos'
  | 'experiencia'
  | 'documentos'
  | 'preview';

const VALID_SECTIONS: MiPerfilSectionKey[] = ['datos', 'formacion', 'conocimientos', 'experiencia', 'documentos', 'preview'];

function isValidSection(value: string | null): value is MiPerfilSectionKey {
  return value !== null && VALID_SECTIONS.includes(value as MiPerfilSectionKey);
}

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, RouterLink, RouterLinkActive, MiPerfilFormacionAcademicaComponent, MiPerfilConocimientosComponent, MiPerfilExperienciaComponent, MiPerfilDocumentosComponent, MiPerfilDocumentosComponent, MiPerfilVistaPreviaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full px-4 py-6 bg-[#f4f4f4] min-h-screen">
      <div class="max-w-[1320px] mx-auto space-y-4">
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
            <a
              routerLink="/portal/dashboard"
              routerLinkActive="!bg-[#4b5563]"
              [routerLinkActiveOptions]="{ exact: true }"
              class="inline-flex items-center gap-1 rounded-md bg-[#374151] px-2.5 py-1.5 text-[0.7rem] font-semibold text-white transition-all duration-200 hover:bg-[#434d5c] hover:shadow-sm"
              aria-label="Inicio"
            >
              <span>🏠</span>
              <span>Inicio</span>
            </a>
            <a
              routerLink="/portal/mi-perfil"
              routerLinkActive="!bg-[#4b5563]"
              [routerLinkActiveOptions]="{ exact: true }"
              class="inline-flex items-center gap-1 rounded-md bg-[#374151] px-2.5 py-1.5 text-[0.7rem] font-semibold text-white transition-all duration-200 hover:bg-[#434d5c] hover:shadow-sm"
              aria-label="Mi Perfil"
            >
              <span>👤</span>
              <span>Mi Perfil</span>
            </a>
            <a
              routerLink="/portal/convocatorias-vigentes"
              routerLinkActive="!bg-[#4b5563]"
              [routerLinkActiveOptions]="{ exact: true }"
              class="inline-flex items-center gap-1 rounded-md bg-[#374151] px-2.5 py-1.5 text-[0.7rem] font-semibold text-white transition-all duration-200 hover:bg-[#434d5c] hover:shadow-sm"
              aria-label="Convocatorias Vigentes"
            >
              <span>📋</span>
              <span>Convocatorias Vigentes</span>
            </a>
            <a
              routerLink="/portal/postulaciones"
              routerLinkActive="!bg-[#4b5563]"
              [routerLinkActiveOptions]="{ exact: false }"
              class="inline-flex items-center gap-1 rounded-md bg-[#374151] px-2.5 py-1.5 text-[0.7rem] font-semibold text-white transition-all duration-200 hover:bg-[#434d5c] hover:shadow-sm"
              aria-label="Mis postulaciones"
            >
              <span>📩</span>
              <span>Mis postulaciones</span>
            </a>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-6">
          <aside class="bg-[#1f2133] text-white min-h-[420px] lg:min-h-[620px] overflow-hidden rounded-lg">
            <nav class="py-4">
              @for (item of menuItems; track item.key) {
                <button
                  type="button"
                  (click)="selectSection(item.key)"
                  class="group relative flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left text-[15px] font-medium transition-all duration-200"
                  [ngClass]="
                    activeSection() === item.key
                      ? 'bg-white/12 text-white shadow-[inset_3px_0_0_0_rgba(255,255,255,0.95)] translate-x-[4px]'
                      : 'text-white/95 hover:bg-white/10 hover:text-white hover:translate-x-[4px]'
                  "
                >
                  <span
                    class="absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-white transition-opacity duration-200"
                    [class.opacity-100]="activeSection() === item.key"
                    [class.opacity-0]="activeSection() !== item.key"
                  ></span>

                  <span class="truncate">{{ item.label }}</span>
                </button>
              }
            </nav>
          </aside>

          <section class="space-y-4 min-w-0">
          @if (activeSection() === 'datos') {
            <div class="bg-[#374151] text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-t-md flex items-center gap-3 font-semibold text-sm">
              <span>◉</span>
              <span>DATOS PERSONALES</span>
            </div>

            @if (loading()) {
              <div class="bg-white border rounded-b-md p-10 text-center text-gray-500 text-sm">Cargando perfil...</div>
            } @else {
              <form [formGroup]="form" (ngSubmit)="onGuardar()" class="bg-white border rounded-b-md p-4 sm:p-5 space-y-6">
                <fieldset class="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
                  <legend class="px-2 text-sm text-gray-800 font-medium">Datos Personales</legend>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label class="label-field text-[11px]">Tipo documento (*)</label>
                      <input class="input-field text-[11px] bg-gray-100" value="DNI" readonly />
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Nro. Documento (*)</label>
                      <input class="input-field text-[11px] bg-gray-100" [value]="perfil()?.numeroDocumento ?? ''" readonly />
                    </div>
                    <div></div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label class="label-field text-[11px]">Nombres (*)</label>
                      <input [formControl]="form.controls.nombres" class="input-field text-[11px] uppercase" maxlength="150" />
                      @if (form.controls.nombres.touched && form.controls.nombres.errors) {
                        <span class="error-text text-[10px]">Ingrese nombres (máx. 150)</span>
                      }
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Apellido Paterno (*)</label>
                      <input [formControl]="form.controls.apellidoPaterno" class="input-field text-[11px] uppercase" maxlength="100" />
                      @if (form.controls.apellidoPaterno.touched && form.controls.apellidoPaterno.errors) {
                        <span class="error-text text-[10px]">Ingrese apellido paterno</span>
                      }
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Apellido Materno (*)</label>
                      <input [formControl]="form.controls.apellidoMaterno" class="input-field text-[11px] uppercase" maxlength="100" />
                      @if (form.controls.apellidoMaterno.touched && form.controls.apellidoMaterno.errors) {
                        <span class="error-text text-[10px]">Ingrese apellido materno</span>
                      }
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label class="label-field text-[11px]">Fecha de nacimiento (*)</label>
                      <input [formControl]="form.controls.fechaNacimiento" type="date" [max]="fechaMaxPermitida" class="input-field text-[11px]" />
                      @if (form.controls.fechaNacimiento.errors?.['menorDeEdad'] && form.controls.fechaNacimiento.touched) {
                        <p class="mt-1 text-[10px] text-red-600">Debe ser mayor de 18 años.</p>
                      }
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Estado civil (*)</label>
                      <select [formControl]="form.controls.estadoCivil" class="input-field text-[11px]">
                        <option value="">-- SELECCIONAR --</option>
                        @for (item of estadosCiviles; track item.value) {
                          <option [value]="item.value">{{ item.label }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Sexo (*)</label>
                      <select [formControl]="form.controls.genero" class="input-field text-[11px]">
                        <option value="">-- SELECCIONAR --</option>
                        <option value="M">MASCULINO</option>
                        <option value="F">FEMENINO</option>
                        <option value="O">OTRO</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                <fieldset class="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
                  <legend class="px-2 text-sm text-gray-800 font-medium">Lugar de Residencia</legend>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label class="label-field text-[11px]">Departamento (*)</label>
                      <select [formControl]="form.controls.departamentoCodigo" class="input-field text-[11px]">
                        <option value="">-- SELECCIONAR --</option>
                        @for (d of departamentos(); track d.codigo) {
                          <option [value]="d.codigo">{{ d.nombre }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Provincia (*)</label>
                      <select [formControl]="form.controls.provinciaCodigo" class="input-field text-[11px]" [disabled]="!form.controls.departamentoCodigo.value">
                        <option value="">-- SELECCIONAR --</option>
                        @for (p of provincias; track p.codigo) {
                          <option [value]="p.codigo">{{ p.nombre }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Distrito (*)</label>
                      <select [formControl]="form.controls.distritoCodigo" class="input-field text-[11px]" [disabled]="!form.controls.provinciaCodigo.value">
                        <option value="">-- SELECCIONAR --</option>
                        @for (d of distritos; track d.codigo) {
                          <option [value]="d.codigo">{{ d.nombre }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="label-field text-[11px]">Dirección (*)</label>
                    <input [formControl]="form.controls.direccion" class="input-field text-[11px] uppercase" maxlength="500" />
                  </div>
                </fieldset>

                <fieldset class="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
                  <legend class="px-2 text-sm text-gray-800 font-medium">Otros</legend>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label class="label-field text-[11px]">Nro. RUC (*)</label>
                      <input [formControl]="form.controls.ruc" class="input-field text-[11px]" maxlength="11" inputmode="numeric" (input)="filterOnlyDigits($event, form.controls.ruc)" />
                      @if (form.controls.ruc.touched && form.controls.ruc.errors) {
                        <span class="error-text text-[10px]">Ingrese 11 dígitos</span>
                      }
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Nro. Brevete</label>
                      <input [formControl]="form.controls.nroBrevete" class="input-field text-[11px]" maxlength="20" inputmode="numeric" (input)="filterOnlyDigits($event, form.controls.nroBrevete)" />
                      @if (form.controls.nroBrevete.touched && form.controls.nroBrevete.errors?.['pattern']) {
                        <p class="mt-1 text-[10px] text-red-600">Solo se permiten dígitos.</p>
                      }
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Categoría (*)</label>
                      <select [formControl]="form.controls.categoriaBrevete" class="input-field text-[11px]">
                        @for (item of categoriasBrevete; track item) {
                          <option [value]="item">{{ item }}</option>
                        }
                      </select>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label class="label-field text-[11px]">Teléfono celular (*)</label>
                      <input [formControl]="form.controls.telefono" class="input-field text-[11px]" maxlength="20" inputmode="numeric" (input)="filterOnlyDigits($event, form.controls.telefono)" />
                      @if (form.controls.telefono.touched && form.controls.telefono.errors) {
                        <p class="mt-1 text-[10px] text-red-600">
                          @if (form.controls.telefono.errors['required']) { Ingrese teléfono celular. }
                          @else if (form.controls.telefono.errors['pattern']) { Solo se permiten dígitos. }
                        </p>
                      }
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Teléfono fijo</label>
                      <input [formControl]="form.controls.telefonoFijo" class="input-field text-[11px]" maxlength="20" inputmode="numeric" (input)="filterOnlyDigits($event, form.controls.telefonoFijo)" />
                      @if (form.controls.telefonoFijo.touched && form.controls.telefonoFijo.errors?.['pattern']) {
                        <p class="mt-1 text-[10px] text-red-600">Solo se permiten dígitos.</p>
                      }
                    </div>
                    <div>
                      <label class="label-field text-[11px]">Correo electrónico (*)</label>
                      <input [formControl]="form.controls.email" type="email" class="input-field text-[11px]" maxlength="200" />
                      @if (form.controls.email.touched && form.controls.email.errors) {
                        <span class="error-text text-[10px]">Ingrese un correo válido</span>
                      }
                    </div>
                  </div>
                </fieldset>

                <fieldset class="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
                  <legend class="px-2 text-sm text-gray-800 font-medium">Colegiatura y Habilitación Profesional</legend>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label class="label-field text-[11px]">¿Cuenta con colegiatura? (*)</label>
                      <select [formControl]="form.controls.tieneColegiatura" class="input-field text-[11px]">
                        <option [ngValue]="false">NO</option>
                        <option [ngValue]="true">SI</option>
                      </select>
                    </div>
                    <div>
                      <label class="label-field text-[11px]">¿Cuenta con habilitación profesional? (*)</label>
                      <select [formControl]="form.controls.tieneHabilitacionProf" class="input-field text-[11px]">
                        <option [ngValue]="false">NO</option>
                        <option [ngValue]="true">SI</option>
                      </select>
                    </div>
                    <div>
                      <label class="label-field text-[11px]">N° de colegiatura</label>
                      <input [formControl]="form.controls.nroColegiatura" class="input-field text-[11px] uppercase" maxlength="50" [readonly]="!requiresNroColegiatura" />
                      @if (requiresNroColegiatura && form.controls.nroColegiatura.touched && form.controls.nroColegiatura.errors) {
                        <span class="error-text text-[10px]">Ingrese el número de colegiatura</span>
                      }
                    </div>
                  </div>
                </fieldset>

                <fieldset class="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
                  <legend class="px-2 text-sm text-gray-800 font-medium">Antecedente Penal, Judicial y Policial</legend>
                  <div class="grid grid-cols-1 gap-4">
                    <div class="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 items-center">
                      <label class="text-[11px] text-gray-700">¿Se encuentra dentro del Registro de Deudores Alimentarios Morosos–REDAM? (*)</label>
                      <select [formControl]="form.controls.estaEnRedam" class="input-field text-[11px] w-full">
                        <option [ngValue]="false">NO</option>
                        <option [ngValue]="true">SI</option>
                      </select>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 items-center">
                      <label class="text-[11px] text-gray-700">¿Se encuentra inscrito en el Registro Nacional de Sanciones contra Servidores Civiles–RNSSC? (*)</label>
                      <select [formControl]="form.controls.estaEnRnssc" class="input-field text-[11px] w-full">
                        <option [ngValue]="false">NO</option>
                        <option [ngValue]="true">SI</option>
                      </select>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 items-center">
                      <label class="text-[11px] text-gray-700">¿Se encuentra inscrito en el Registro Nacional de Deudores de reparaciones Civiles – REDERECI? (*)</label>
                      <select [formControl]="form.controls.estaEnRedereci" class="input-field text-[11px] w-full">
                        <option [ngValue]="false">NO</option>
                        <option [ngValue]="true">SI</option>
                      </select>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 items-center">
                      <label class="text-[11px] text-gray-700">¿A la fecha cuenta con antecedentes penales? (*)</label>
                      <select [formControl]="form.controls.tieneAntecedentesPenales" class="input-field text-[11px] w-full">
                        <option [ngValue]="false">NO</option>
                        <option [ngValue]="true">SI</option>
                      </select>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 items-center">
                      <label class="text-[11px] text-gray-700">¿A la fecha cuenta con antecedentes policiales? (*)</label>
                      <select [formControl]="form.controls.tieneAntecedentesPoliciales" class="input-field text-[11px] w-full">
                        <option [ngValue]="false">NO</option>
                        <option [ngValue]="true">SI</option>
                      </select>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 items-center">
                      <label class="text-[11px] text-gray-700">¿A la fecha cuenta con antecedentes judiciales? (*)</label>
                      <select [formControl]="form.controls.tieneAntecedentesJudiciales" class="input-field text-[11px] w-full">
                        <option [ngValue]="false">NO</option>
                        <option [ngValue]="true">SI</option>
                      </select>
                    </div>
                  </div>
                </fieldset>

                <fieldset class="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
                  <legend class="px-2 text-sm text-gray-800 font-medium">Declaración Jurada De No Tener Impedimentos Ni Prohibición Para Celebrar Contratos Con El Estado Ley N° 26771 Y Decreto Supremo 021-2000-PCM</legend>
                  <div class="text-[11px] text-gray-700 space-y-3 leading-5">
                    <p>Declaro aceptar las bases y la convocatoria del proceso de Selección.</p>
                    <p>Declaro estar habilitado administrativa o judicialmente para el ejercicio de la profesión, para contratar con el Estado o para desempeñar función pública.</p>
                    <p>Declaro no presentarme a otra convocatoria CAS o 728 de la Defensoría del Pueblo que tenga el mismo Cronograma, en cumplimiento a la Directiva actual.</p>
                    <p>Declaro no percibir simultáneamente remuneración y pensión, u honorarios por concepto de locación de servicios, asesorías o consultorías, o cualquier otra doble percepción o ingresos del Estado, salvo por el ejercicio de la actividad docente y la percepción de dietas por participación en uno (1) de los directorios de entidades o empresas públicas, o por ser miembro únicamente de un órgano colegiado.</p>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 items-end">
                    <div>
                      <label class="label-field text-[11px]">Declaro no tener grado de parentesco hasta el 4° de consanguinidad o 2° de afinidad y por razón de matrimonio o por unión de hecho... De ser afirmativo señale nombre y parentesco:</label>
                      <textarea [formControl]="form.controls.detalleDeclaracionJurada" class="input-field text-[11px] min-h-[100px] uppercase" maxlength="2000"></textarea>
                    </div>
                    <div>
                      <label class="label-field text-[11px]">¿Acepta la declaración jurada? (*)</label>
                      <select [formControl]="form.controls.aceptaDeclaracionJurada" class="input-field text-[11px]">
                        <option [ngValue]="false">NO</option>
                        <option [ngValue]="true">SI</option>
                      </select>
                    </div>
                  </div>
                  <div class="text-[11px] text-gray-500">Nota: (*) Campos obligatorios a llenar</div>
                </fieldset>

                @if (errorMsg()) {
                  <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
                    {{ errorMsg() }}
                  </div>
                }

                <div class="flex justify-end gap-3">
                  <button type="submit" [disabled]="saving()" aria-label="Guardar datos personales"
                    class="inline-flex items-center justify-center gap-2 rounded-md bg-[#5cb85c] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-95 disabled:opacity-50">
                    @if (saving()) { <span class="animate-spin">⟳</span> }
                    Guardar
                  </button>
                </div>
              </form>
            }
          } @else if (activeSection() === 'formacion') {
            <app-mi-perfil-formacion-academica />
          } @else if (activeSection() === 'conocimientos') {
            <app-mi-perfil-conocimientos />
          } @else if (activeSection() === 'experiencia') {
            <app-mi-perfil-experiencia />
          } @else if (activeSection() === 'documentos') {
            <app-mi-perfil-documentos />
          } @else if (activeSection() === 'preview') {
            <app-mi-perfil-vista-previa />
          } @else {
            <div class="bg-white border rounded-md p-10 text-center text-gray-500">
              Esta sección se implementará en el siguiente entregable visual.
            </div>
          }
          </section>
        </div>
      </div>
    </div>
  `,
})
export class MiPerfilComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly perfilService = inject(PostulantePerfilService);
  private readonly ubigeoService = inject(UbigeoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly menuItems: { key: MiPerfilSectionKey; label: string }[] = [
    { key: 'datos', label: 'Datos Personales' },
    { key: 'formacion', label: 'Formación Académica' },
    { key: 'conocimientos', label: 'Conocimientos' },
    { key: 'experiencia', label: 'Experiencia' },
    { key: 'documentos', label: 'Documentos' },
    { key: 'preview', label: 'Vista previa' },
  ];

  readonly activeSection = signal<MiPerfilSectionKey>('datos');

  readonly estadosCiviles = [
    { value: 'SOLTERO', label: 'SOLTERO' },
    { value: 'CASADO', label: 'CASADO' },
    { value: 'VIUDO', label: 'VIUDO' },
    { value: 'DIVORCIADO', label: 'DIVORCIADO' },
    { value: 'CONVIVIENTE', label: 'CONVIVIENTE' },
  ];

  readonly categoriasBrevete = ['NO APLICA', 'A-I', 'A-IIA', 'A-IIB', 'A-IIIA', 'A-IIIB', 'A-IIIC', 'B-IIC'];

  loading = signal(true);
  saving = signal(false);
  errorMsg = signal('');
  perfil = signal<PostulantePerfil | null>(null);

  departamentos = signal<UbigeoDepartamento[]>([]);

  get provincias(): UbigeoProvincia[] {
    const deptCodigo = this.form.controls.departamentoCodigo.value;
    const depts = this.departamentos();
    if (!deptCodigo || depts.length === 0) return [];
    return depts.find((d) => d.codigo === deptCodigo)?.provincias ?? [];
  }

  get distritos(): UbigeoDistrito[] {
    const provCodigo = this.form.controls.provinciaCodigo.value;
    const provs = this.provincias;
    if (!provCodigo || provs.length === 0) return [];
    return provs.find((p) => p.codigo === provCodigo)?.distritos ?? [];
  }

  get requiresNroColegiatura(): boolean {
    return this.form.controls.tieneColegiatura.value === true;
  }

  filterOnlyDigits(event: Event, control: AbstractControl): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '');
    if (input.value !== clean) {
      input.value = clean;
      control.setValue(clean, { emitEvent: true });
    }
  }

  get fechaMaxPermitida(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear() - 18;
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  get ubigeoCompleto(): boolean {
    const dep = this.form.controls.departamentoCodigo.value;
    const prov = this.form.controls.provinciaCodigo.value;
    const dist = this.form.controls.distritoCodigo.value;
    return !!dep && !!prov && !!dist;
  }

  form = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(150)]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(100)]],
    apellidoMaterno: ['', [Validators.required, Validators.maxLength(100)]],
    fechaNacimiento: ['', [Validators.required, mayorDeEdadValidator]],
    estadoCivil: ['', [Validators.required, Validators.maxLength(20)]],
    genero: ['', [Validators.required, Validators.maxLength(1)]],
    telefono: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^\d+$/)]],
    telefonoFijo: ['', [Validators.maxLength(20), Validators.pattern(/^\d+$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    direccion: ['', [Validators.required, Validators.maxLength(500)]],
    departamentoCodigo: ['', [Validators.required]],
    provinciaCodigo: ['', [Validators.required]],
    distritoCodigo: ['', [Validators.required]],
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    nroBrevete: ['', [Validators.maxLength(20), Validators.pattern(/^\d+$/)]],
    categoriaBrevete: ['NO APLICA', [Validators.required, Validators.maxLength(30)]],
    tieneColegiatura: [false],
    tieneHabilitacionProf: [false],
    nroColegiatura: ['', [Validators.maxLength(50)]],
    estaEnRedam: [false],
    estaEnRnssc: [false],
    estaEnRedereci: [false],
    tieneAntecedentesPenales: [false],
    tieneAntecedentesPoliciales: [false],
    tieneAntecedentesJudiciales: [false],
    aceptaDeclaracionJurada: [true, [Validators.required]],
    detalleDeclaracionJurada: ['', [Validators.maxLength(2000)]],
    esLicenciadoFfaa: [false],
    esPersonaDiscap: [false],
    esDeportistaDest: [false],
  });

  selectSection(section: MiPerfilSectionKey): void {
    this.activeSection.set(section);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section },
      queryParamsHandling: 'merge',
    });
  }

  ngOnInit(): void {
    this.syncSectionFromQueryParams();
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncSectionFromQueryParams());

    this.ubigeoService
      .getUbigeos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (data) => this.departamentos.set(data) });

    this.form.controls.departamentoCodigo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.form.controls.provinciaCodigo.setValue('');
        this.form.controls.distritoCodigo.setValue('');
      });

    this.form.controls.provinciaCodigo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.form.controls.distritoCodigo.setValue('');
      });

    this.form.controls.tieneColegiatura.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        if (valor !== true) {
          this.form.controls.nroColegiatura.setValue('');
        }
      });

    this.perfilService
      .getMiPerfil()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success && res.data) {
            this.perfil.set(res.data);
            this.patchForm(res.data);
          } else {
            this.toast.error('No se pudo cargar el perfil');
          }
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('No se pudo cargar el perfil');
        },
      });
  }

  private syncSectionFromQueryParams(): void {
    const section = this.route.snapshot.queryParamMap.get('section');
    if (isValidSection(section)) {
      this.activeSection.set(section);
    }
  }

  private patchForm(p: PostulantePerfil): void {
    const ubigeo = p.ubigeo ?? '';
    const dep = ubigeo.length >= 6 ? ubigeo.slice(0, 2) : '';
    const prov = ubigeo.length >= 6 ? ubigeo.slice(2, 4) : '';
    const dist = ubigeo.length >= 6 ? ubigeo.slice(4, 6) : '';

    this.form.patchValue(
      {
        departamentoCodigo: dep,
        provinciaCodigo: prov,
        distritoCodigo: dist,
      },
      { emitEvent: false },
    );

    this.form.patchValue({
      nombres: p.nombres ?? '',
      apellidoPaterno: p.apellidoPaterno ?? '',
      apellidoMaterno: p.apellidoMaterno ?? '',
      fechaNacimiento: p.fechaNacimiento ?? '',
      estadoCivil: p.estadoCivil ?? '',
      genero: p.genero ?? '',
      telefono: p.telefono ?? '',
      telefonoFijo: p.telefonoFijo ?? '',
      email: p.email ?? '',
      direccion: p.direccion ?? '',
      ruc: p.ruc ?? '',
      nroBrevete: p.nroBrevete ?? '',
      categoriaBrevete: p.categoriaBrevete ?? 'NO APLICA',
      tieneColegiatura: p.tieneColegiatura ?? false,
      tieneHabilitacionProf: p.tieneHabilitacionProf ?? false,
      nroColegiatura: p.nroColegiatura ?? '',
      estaEnRedam: p.estaEnRedam ?? false,
      estaEnRnssc: p.estaEnRnssc ?? false,
      estaEnRedereci: p.estaEnRedereci ?? false,
      tieneAntecedentesPenales: p.tieneAntecedentesPenales ?? false,
      tieneAntecedentesPoliciales: p.tieneAntecedentesPoliciales ?? false,
      tieneAntecedentesJudiciales: p.tieneAntecedentesJudiciales ?? false,
      aceptaDeclaracionJurada: p.aceptaDeclaracionJurada ?? true,
      detalleDeclaracionJurada: p.detalleDeclaracionJurada ?? '',
      esLicenciadoFfaa: p.esLicenciadoFfaa ?? false,
      esPersonaDiscap: p.esPersonaDiscap ?? false,
      esDeportistaDest: p.esDeportistaDest ?? false,
    });
  }

  onGuardar(): void {
    const nroColegiaturaCtrl = this.form.controls.nroColegiatura;

    nroColegiaturaCtrl.setErrors(null);
    nroColegiaturaCtrl.updateValueAndValidity({
      onlySelf: true,
      emitEvent: false,
    });

    if (this.requiresNroColegiatura && !nroColegiaturaCtrl.value.trim()) {
      nroColegiaturaCtrl.setErrors({
        ...(nroColegiaturaCtrl.errors ?? {}),
        required: true,
      });
    }

    if (this.form.controls.aceptaDeclaracionJurada.value !== true) {
      this.form.controls.aceptaDeclaracionJurada.markAsTouched();
      this.errorMsg.set('Debe aceptar la declaración jurada para guardar su perfil.');
      return;
    }

    if (this.form.invalid || !this.ubigeoCompleto) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Complete correctamente los campos obligatorios de Datos Personales.');
      return;
    }

    this.errorMsg.set('');
    this.saving.set(true);

    const val = this.form.getRawValue();
    const ubigeo = (val.departamentoCodigo ?? '') + (val.provinciaCodigo ?? '') + (val.distritoCodigo ?? '');

    const req: ActualizarPerfilPostulanteRequest = {
      nombres: val.nombres,
      apellidoPaterno: val.apellidoPaterno,
      apellidoMaterno: val.apellidoMaterno,
      fechaNacimiento: val.fechaNacimiento,
      estadoCivil: val.estadoCivil,
      genero: val.genero,
      telefono: val.telefono,
      telefonoFijo: val.telefonoFijo || undefined,
      email: val.email,
      direccion: val.direccion,
      ubigeo,
      ruc: val.ruc,
      nroBrevete: val.nroBrevete || undefined,
      categoriaBrevete: val.categoriaBrevete,
      tieneColegiatura: val.tieneColegiatura,
      tieneHabilitacionProf: val.tieneHabilitacionProf,
      nroColegiatura: val.nroColegiatura || undefined,
      estaEnRedam: val.estaEnRedam,
      estaEnRnssc: val.estaEnRnssc,
      estaEnRedereci: val.estaEnRedereci,
      tieneAntecedentesPenales: val.tieneAntecedentesPenales,
      tieneAntecedentesPoliciales: val.tieneAntecedentesPoliciales,
      tieneAntecedentesJudiciales: val.tieneAntecedentesJudiciales,
      aceptaDeclaracionJurada: val.aceptaDeclaracionJurada,
      detalleDeclaracionJurada: val.detalleDeclaracionJurada || undefined,
      esLicenciadoFfaa: val.esLicenciadoFfaa,
      esPersonaDiscap: val.esPersonaDiscap,
      esDeportistaDest: val.esDeportistaDest,
    };

    this.perfilService
      .actualizarPerfil(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.saving.set(false);

          if (res.success && res.data) {
            this.perfil.set(res.data);
            this.patchForm(res.data);
            this.errorMsg.set('');
            this.toast.success(res.message ?? 'Perfil actualizado correctamente');
            return;
          }

          const backendMsg = res.error ?? res.message ?? 'No se pudo actualizar el perfil';
          this.errorMsg.set(backendMsg);
          this.toast.error(backendMsg);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const backendMsg = this.extractApiError(error, 'No se pudo actualizar el perfil');
          this.errorMsg.set(backendMsg);
          this.toast.error(backendMsg);
        },
      });
  }

  private extractApiError(error: HttpErrorResponse, fallback: string): string {
    const body = error?.error;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }

    if (body && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }

    return fallback;
  }
}