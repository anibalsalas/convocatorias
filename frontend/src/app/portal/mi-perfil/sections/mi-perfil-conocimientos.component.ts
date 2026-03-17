import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    signal,
    viewChild,
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { HttpErrorResponse } from '@angular/common/http';
  import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
  import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
  
  import { ToastService } from '@core/services/toast.service';
  import { PostulanteConocimientoService } from '@core/services/postulante-conocimiento.service';
  import { PostulanteConocimiento } from '@shared/models/postulante-conocimiento.model';
  import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
  
  type FormMode = 'list' | 'create' | 'edit';
  
  @Component({
    selector: 'app-mi-perfil-conocimientos',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <div class="space-y-4 min-w-0 w-full">
        @if (mode() === 'list') {
          <div class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="bg-[#374151] px-4 py-3 sm:px-5 sm:py-3.5 text-sm font-semibold text-white flex items-center gap-3">
              <span>◉</span>
              <span>CONOCIMIENTOS</span>
            </div>

            <div class="flex flex-col flex-1 min-h-0 p-4 sm:p-5  bg-white">
              <div class="mb-4 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  (click)="onNuevo()"
                  aria-label="Agregar nuevo conocimiento"
                  class="inline-flex items-center gap-2 rounded-md bg-[#5cb85c] px-3 py-2 text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:brightness-95 hover:shadow-md"
                >
                  <span>＋</span>
                  <span>Agregar</span>
                </button>
              </div>

              @if (loading()) {
                <div class="py-12 text-center text-gray-500 text-sm">Cargando conocimientos...</div>
              } @else if (items().length === 0) {
                <div class="py-12 text-center text-gray-500 text-sm">No se encontraron registros de conocimientos.</div>
              } @else {
                <!-- Vista móvil: tarjetas -->
                <div class="space-y-3 md:hidden">
                  @for (item of items(); track item.idConocimiento; let i = $index) {
                    <div class="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-2">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <p class="text-xs font-medium text-gray-500 uppercase">{{ getTipoDisplay(item) }}</p>
                          <p class="text-sm font-semibold text-gray-800 break-words">{{ item.descripcion }}</p>
                          <p class="text-xs text-gray-600 mt-0.5">{{ item.nivel }}</p>
                        </div>
                        <span class="flex-shrink-0 text-xs font-medium text-gray-400">#{{ i + 1 }}</span>
                      </div>
                      @if (item.institucion || item.horas != null || item.fechaInicio || item.fechaFin) {
                        <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-600">
                          @if (item.institucion) { <span class="break-words">{{ item.institucion }}</span> }
                          @if (item.horas != null) { <span>{{ item.horas }} h</span> }
                          @if (item.fechaInicio || item.fechaFin) {
                            <span>{{ formatFecha(item.fechaInicio) || '—' }} - {{ formatFecha(item.fechaFin) || '—' }}</span>
                          }
                        </div>
                      }
                      <div class="flex gap-2 pt-2 border-t border-gray-200">
                        <button type="button" (click)="onVerSustento(item)" [attr.aria-label]="'Ver sustento PDF de ' + item.descripcion"
                          class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-[#1F2133] bg-white border border-gray-300 hover:bg-gray-50">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7zm0 1.5L18.5 8H14zM8 12h8v1.5H8zm0 3h8v1.5H8zm0-6h4v1.5H8z"/></svg>
                          Ver
                        </button>
                        <button type="button" (click)="onEditar(item)" [attr.aria-label]="'Editar conocimiento ' + item.descripcion"
                          class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-[#1F2133] bg-white border border-gray-300 hover:bg-gray-50">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75l11-11.03-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0L15.13 5.12l3.75 3.75z"/></svg>
                          Editar
                        </button>
                        <button type="button" (click)="onEliminar(item)" [attr.aria-label]="'Eliminar conocimiento ' + item.descripcion"
                          class="inline-flex items-center justify-center rounded-md p-2 text-red-600 bg-red-50 border border-red-200 hover:bg-red-100">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4zm1 6h2v8h-2zm4 0h2v8h-2zM6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/></svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>

                <!-- Vista desktop: tabla -->
                <div class="hidden md:block w-full min-w-0 overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] border border-gray-200 rounded-md">
                  <table class="w-full min-w-[700px] table-auto text-xs sm:text-sm">
                    <thead class="bg-[#374151] text-white sticky top-0 z-10">
                      <tr>
                        <th class="border-r border-white/20 px-2 py-2 text-center font-semibold w-12">#</th>
                        <th class="border-r border-white/20 px-3 py-2 text-left font-semibold">Tipo</th>
                        <th class="border-r border-white/20 px-3 py-2 text-left font-semibold">Descripción</th>
                        <th class="border-r border-white/20 px-3 py-2 text-left font-semibold">Nivel</th>
                        <th class="border-r border-white/20 px-3 py-2 text-left font-semibold">Institución</th>
                        <th class="border-r border-white/20 px-2 py-2 text-center font-semibold w-16">Horas</th>
                        <th class="border-r border-white/20 px-2 py-2 text-center font-semibold w-24">F. Inicio</th>
                        <th class="border-r border-white/20 px-2 py-2 text-center font-semibold w-24">F. Fin</th>
                        <th class="border-r border-white/20 px-2 py-2 text-center font-semibold w-20">Sustento</th>
                        <th class="border-r border-white/20 px-2 py-2 text-center font-semibold w-20">Editar</th>
                        <th class="px-2 py-2 text-center font-semibold w-20">Eliminar</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of items(); track item.idConocimiento; let i = $index) {
                        <tr class="border-t border-gray-200 text-gray-800 hover:bg-gray-50/50 transition-colors">
                          <td class="px-2 py-2 text-center">{{ i + 1 }}</td>
                          <td class="min-w-0 px-3 py-2 uppercase break-words text-[10px] align-top">{{ getTipoDisplay(item) }}</td>
                          <td class="min-w-0 px-3 py-2 uppercase break-words text-[10px] align-top">{{ item.descripcion }}</td>
                          <td class="min-w-0 px-3 py-2 uppercase break-words text-[10px] align-top">{{ item.nivel }}</td>
                          <td class="min-w-0 px-3 py-2 uppercase break-words text-[10px] align-top">{{ item.institucion || '—' }}</td>
                          <td class="px-2 py-2 text-center text-[10px]">{{ item.horas ?? '—' }}</td>
                          <td class="px-2 py-2 text-center whitespace-nowrap text-[10px]">{{ formatFecha(item.fechaInicio) || '—' }}</td>
                          <td class="px-2 py-2 text-center whitespace-nowrap text-[10px]">{{ formatFecha(item.fechaFin) || '—' }}</td>
                          <td class="px-2 py-2 text-center">
                            <button type="button" (click)="onVerSustento(item)" [attr.aria-label]="'Ver sustento PDF de ' + item.descripcion"
                              class="inline-flex items-center justify-center rounded-md p-2 text-[#1F2133] transition-colors hover:bg-gray-100" title="Ver sustento">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7zm0 1.5L18.5 8H14zM8 12h8v1.5H8zm0 3h8v1.5H8zm0-6h4v1.5H8z"/></svg>
                            </button>
                          </td>
                          <td class="px-2 py-2 text-center">
                            <button type="button" (click)="onEditar(item)" [attr.aria-label]="'Editar conocimiento ' + item.descripcion"
                              class="inline-flex items-center justify-center rounded-md p-2 text-[#1F2133] transition-colors hover:bg-gray-100" title="Editar">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75l11-11.03-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0L15.13 5.12l3.75 3.75z"/></svg>
                            </button>
                          </td>
                          <td class="px-2 py-2 text-center">
                            <button type="button" (click)="onEliminar(item)" [attr.aria-label]="'Eliminar conocimiento ' + item.descripcion"
                              class="inline-flex items-center justify-center rounded-md p-2 text-[#1F2133] transition-colors hover:bg-red-50 hover:text-red-600" title="Eliminar">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4zm1 6h2v8h-2zm4 0h2v8h-2zM6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/></svg>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="bg-[#374151] px-4 py-3 sm:px-5 sm:py-3.5 text-sm font-semibold text-white flex items-center gap-3">
              <span>◉</span>
              <span>{{ mode() === 'create' ? 'Nuevo Conocimiento' : 'Editar Conocimiento' }}</span>
            </div>
  
            <form [formGroup]="form" (ngSubmit)="onGuardar()" class="space-y-6 bg-white p-4 sm:p-5">
              <fieldset class="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
                <legend class="px-2 text-sm text-gray-800 font-medium">Conocimiento</legend>
  
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="label-field text-[11px]">Tipo de Conocimiento (*)</label>
                    <select formControlName="tipoConocimiento" class="input-field text-[11px]">
                      <option value="">-- SELECCIONAR --</option>
                      @for (item of tipoConocimientoOptions; track item) {
                        <option [value]="item">{{ item }}</option>
                      }
                    </select>
                    @if (form.controls.tipoConocimiento.touched && form.controls.tipoConocimiento.errors) {
                      <span class="error-text text-[10px]">Seleccione el tipo de conocimiento</span>
                    }
                  </div>

                  @if (tipoConocimiento === 'OFIMATICA') {
                    <div>
                      <label class="label-field text-[11px]">Tipo de Ofimática (*)</label>
                      <select formControlName="tipoOfimatica" class="input-field text-[11px]">
                        <option value="">-- SELECCIONAR --</option>
                        @for (item of tipoOfimaticaOptions; track item) {
                          <option [value]="item">{{ item }}</option>
                        }
                      </select>
                      @if (form.controls.tipoOfimatica.touched && form.controls.tipoOfimatica.errors) {
                        <span class="error-text text-[10px]">Seleccione el tipo de ofimática</span>
                      }
                    </div>
                  }

                  <div>
                    <label class="label-field text-[11px]">Nivel (*)</label>
                    <select formControlName="nivel" class="input-field text-[11px]">
                      <option value="">-- SELECCIONAR --</option>
                      @for (item of nivelOptions; track item) {
                        <option [value]="item">{{ item }}</option>
                      }
                    </select>
                    @if (form.controls.nivel.touched && form.controls.nivel.errors) {
                      <span class="error-text text-[10px]">Seleccione el nivel</span>
                    }
                  </div>

                  @if (tipoConocimiento !== 'OFIMATICA' && tipoConocimiento !== 'IDIOMA') {
                    <div>
                      <label class="label-field text-[11px]">Horas Académicas</label>
                      <input formControlName="horas" type="number" min="1" max="9999" class="input-field text-[11px]" (input)="onHorasInput($event)" />
                      @if (form.controls.horas.touched && form.controls.horas.errors) {
                        <span class="error-text text-[10px]">Ingrese horas válidas (máx. 4 dígitos)</span>
                      }
                    </div>
                  }
                </div>
  
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-2">
                    <label class="label-field text-[11px]">Descripción (*)</label>
                    <input formControlName="descripcion" class="input-field text-[11px] uppercase" maxlength="300" />
                    @if (form.controls.descripcion.touched && form.controls.descripcion.errors) {
                      <span class="error-text text-[10px]">Ingrese la descripción</span>
                    }
                  </div>
  
                  @if (tipoConocimiento !== 'OFIMATICA' && tipoConocimiento !== 'IDIOMA') {
                    <div>
                      <label class="label-field text-[11px]">Institución</label>
                      <input formControlName="institucion" class="input-field text-[11px] uppercase" maxlength="200" />
                    </div>
                  }
                </div>
  
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  @if (tipoConocimiento !== 'OFIMATICA' && tipoConocimiento !== 'IDIOMA') {
                    <div>
                      <label class="label-field text-[11px]">Fecha Inicio</label>
                      <input formControlName="fechaInicio" type="date" class="input-field text-[11px]" />
                    </div>

                    <div>
                      <label class="label-field text-[11px]">Fecha Fin</label>
                      <input formControlName="fechaFin" type="date" class="input-field text-[11px]" />
                      @if (form.errors && form.errors['invalidDateRange']) {
                        <span class="error-text text-[10px] block mt-1">La fecha fin no puede ser menor que la fecha inicio</span>
                      }
                      @if (form.errors && form.errors['datePairRequired']) {
                        <span class="error-text text-[10px] block mt-1">Debe ingresar ambas fechas: inicio y fin</span>
                      }
                    </div>
                  }
  
                  <div>
                    <label class="label-field text-[11px]">
                      Adjuntar Documento (*)
                      <span class="text-[9px] text-red-500">(Archivos permitidos: .pdf, máx. 3 MB)</span>
                    </label>
                    <input
                      #fileInput
                      type="file"
                      accept="application/pdf,.pdf"
                      aria-label="Adjuntar documento PDF de sustento (máximo 3 MB)"
                      class="block w-full text-[11px] text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-2 file:py-1 file:text-[11px]"
                      (change)="onFileSelected($event)"
                    />
                    <div class="mt-2 text-[11px] text-gray-500">
                      {{ currentFileName() }}
                    </div>
                    @if (fileError()) {
                      <span class="error-text">{{ fileError() }}</span>
                    }
                  </div>
                </div>
              </fieldset>
  
              <div class="text-[11px] text-gray-500">Nota: (*) Campos obligatorios a llenar</div>
  
              @if (errorMsg()) {
                <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-700">
                  {{ errorMsg() }}
                </div>
              }
  
              <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                  type="submit"
                  [disabled]="saving()"
                  aria-label="Guardar conocimiento"
                  class="inline-flex items-center justify-center gap-2 rounded-md bg-[#5cb85c] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-95 disabled:opacity-60"
                >
                  @if (saving()) {
                    <span class="animate-spin">⟳</span>
                  } @else {
                    <span>💾</span>
                  }
                  <span>Guardar</span>
                </button>
  
                <button
                  type="button"
                  (click)="onVolver()"
                  aria-label="Volver a la lista de conocimientos"
                  class="inline-flex items-center justify-center gap-2 rounded-md bg-[#337ab7] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-95"
                >
                  <span>↩</span>
                  <span>Volver</span>
                </button>
              </div>
            </form>
          </div>
        }

        <app-confirm-dialog
          [open]="showConfirmDelete()"
          title="¿Eliminar conocimiento?"
          [message]="confirmDeleteMessage()"
          confirmText="Sí, eliminar"
          [confirmDanger]="true"
          (confirm)="onConfirmEliminar()"
          (cancel)="showConfirmDelete.set(false); itemToDelete.set(null)" />
      </div>
    `,
  })
  export class MiPerfilConocimientosComponent {
    private readonly fb = inject(FormBuilder);
    private readonly service = inject(PostulanteConocimientoService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly cdr = inject(ChangeDetectorRef);
  
    readonly tipoConocimientoOptions = [
      'CERTIFICACIÓN',
      'DIPLOMADO',
      'ESPECIALIZACIÓN',
      'CURSO',
      'PROGRAMA',
      'OFIMATICA',
      'IDIOMA',
    ];
  
    readonly nivelOptions = [
      'NO APLICA',
      'BÁSICO',
      'INTERMEDIO',
      'AVANZADO',
    ];

    readonly tipoOfimaticaOptions = [
      'WORD',
      'EXCEL',
      'POWER POINT',
      'ACCESS',
      'OUTLOOK',
      'GOOGLE DOCS',
      'GOOGLE SHEETS',
      'GOOGLE SLIDES',
      'OTRO',
    ];

    get tipoConocimiento(): string {
      return this.form?.controls?.tipoConocimiento?.value ?? '';
    }
  
    readonly form = this.fb.nonNullable.group(
      {
        tipoConocimiento: ['', [Validators.required, Validators.maxLength(30)]],
        tipoOfimatica: ['', [Validators.maxLength(100)]],
        descripcion: ['', [Validators.required, Validators.maxLength(300)]],
        nivel: ['', [Validators.required, Validators.maxLength(30)]],
        institucion: ['', [Validators.maxLength(200)]],
        horas: [null as number | null, [Validators.min(1), Validators.max(9999)]],
        fechaInicio: [''],
        fechaFin: [''],
      },
      { validators: [this.dateRangeValidator] },
    );
  
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly mode = signal<FormMode>('list');
    readonly items = signal<PostulanteConocimiento[]>([]);
    readonly editingId = signal<number | null>(null);
    readonly errorMsg = signal('');
    readonly fileError = signal('');
    readonly currentFileName = signal('Ningún archivo seleccionado');
    readonly showConfirmDelete = signal(false);
    readonly itemToDelete = signal<PostulanteConocimiento | null>(null);
    readonly confirmDeleteMessage = computed(() => {
      const item = this.itemToDelete();
      if (!item) return '';
      return `¿Desea eliminar el conocimiento «${item.descripcion}»? Esta acción no se puede deshacer.`;
    });
  
    private selectedFile: File | null = null;
    private skipClearOnTipoChange = false;
    readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    constructor() {
      this.loadItems();
      this.form.controls.tipoConocimiento.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((tipo) => {
          if (!this.skipClearOnTipoChange) {
            this.clearFieldsOnTipoChange();
          } else {
            this.skipClearOnTipoChange = false;
          }
          this.updateValidatorsOnTipoChange(tipo ?? '');
          this.cdr.markForCheck();
        });
      this.updateValidatorsOnTipoChange(this.form.controls.tipoConocimiento.value ?? '');
    }

    private clearFieldsOnTipoChange(): void {
      this.form.patchValue({
        tipoOfimatica: '',
        descripcion: '',
        nivel: '',
        institucion: '',
        horas: null,
        fechaInicio: '',
        fechaFin: '',
      }, { emitEvent: false });
      this.selectedFile = null;
      this.fileError.set('');
      this.errorMsg.set('');
      this.currentFileName.set('Ningún archivo seleccionado');
      const input = this.fileInputRef()?.nativeElement;
      if (input) input.value = '';
    }

    private updateValidatorsOnTipoChange(tipo: string): void {
      const c = this.form.controls;
      if (tipo === 'OFIMATICA') {
        this.setValidatorsOfimatica(c);
      } else if (tipo === 'IDIOMA') {
        this.setValidatorsIdioma(c);
      } else {
        this.setValidatorsOther(c);
      }
      this.updateAllValidators(c);
    }

    private setValidatorsOfimatica(c: typeof this.form.controls): void {
      c.tipoOfimatica.setValidators([Validators.required, Validators.maxLength(100)]);
      c.horas.clearValidators();
      c.horas.setValue(null, { emitEvent: false });
      c.institucion.setValue('', { emitEvent: false });
      c.fechaInicio.setValue('', { emitEvent: false });
      c.fechaFin.setValue('', { emitEvent: false });
    }

    private setValidatorsIdioma(c: typeof this.form.controls): void {
      c.tipoOfimatica.clearValidators();
      c.tipoOfimatica.setValue('', { emitEvent: false });
      c.horas.clearValidators();
      c.horas.setValue(null, { emitEvent: false });
      c.institucion.setValue('', { emitEvent: false });
      c.fechaInicio.setValue('', { emitEvent: false });
      c.fechaFin.setValue('', { emitEvent: false });
    }

    private setValidatorsOther(c: typeof this.form.controls): void {
      c.tipoOfimatica.clearValidators();
      c.tipoOfimatica.setValue('', { emitEvent: false });
      c.horas.setValidators([Validators.min(1), Validators.max(9999)]);
    }

    private updateAllValidators(c: typeof this.form.controls): void {
      c.tipoOfimatica.updateValueAndValidity({ emitEvent: false });
      c.horas.updateValueAndValidity({ emitEvent: false });
      c.institucion.updateValueAndValidity({ emitEvent: false });
      c.fechaInicio.updateValueAndValidity({ emitEvent: false });
      c.fechaFin.updateValueAndValidity({ emitEvent: false });
      this.form.updateValueAndValidity({ emitEvent: false });
    }

    onHorasInput(event: Event): void {
      const input = event.target as HTMLInputElement;
      const val = input.value.replace(/\D/g, '');
      if (val.length > 4) {
        const truncated = val.slice(0, 4);
        input.value = truncated;
        this.form.controls.horas.setValue(parseInt(truncated, 10) || null, { emitEvent: false });
      }
    }
  
    onNuevo(): void {
      this.resetForm();
      this.mode.set('create');
    }
  
    onEditar(item: PostulanteConocimiento): void {
      this.skipClearOnTipoChange = true;
      this.form.patchValue({
        tipoConocimiento: item.tipoConocimiento ?? '',
        tipoOfimatica: item.tipoOfimatica ?? '',
        descripcion: item.descripcion ?? '',
        nivel: item.nivel ?? '',
        institucion: item.institucion ?? '',
        horas: item.horas ?? null,
        fechaInicio: item.fechaInicio ?? '',
        fechaFin: item.fechaFin ?? '',
      });
  
      this.editingId.set(item.idConocimiento);
      this.selectedFile = null;
      this.fileError.set('');
      this.errorMsg.set('');
      this.currentFileName.set(item.nombreArchivo || 'Ningún archivo seleccionado');
      this.mode.set('edit');
    }
  
    onVolver(): void {
      this.resetForm();
      this.mode.set('list');
    }
  
    private readonly maxPdfBytes = 3 * 1024 * 1024;

    onFileSelected(event: Event): void {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0] ?? null;

      if (!file) {
        this.selectedFile = null;
        this.currentFileName.set('Ningún archivo seleccionado');
        this.fileError.set('');
        return;
      }

      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (!isPdf) {
        this.selectedFile = null;
        this.currentFileName.set('Ningún archivo seleccionado');
        this.fileError.set('Solo se permite adjuntar archivos PDF.');
        this.toast.error('Solo se permite adjuntar archivos PDF.');
        input.value = '';
        return;
      }

      if (file.size > this.maxPdfBytes) {
        this.selectedFile = null;
        this.currentFileName.set('Ningún archivo seleccionado');
        this.fileError.set('El archivo no debe superar 3 MB.');
        this.toast.error('El archivo no debe superar 3 MB.');
        input.value = '';
        return;
      }

      this.selectedFile = file;
      this.currentFileName.set(file.name);
      this.fileError.set('');
    }
  
    onGuardar(): void {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.errorMsg.set('Complete correctamente los campos obligatorios de Conocimientos.');
        return;
      }
      if (this.mode() === 'create' && !this.selectedFile) {
        this.fileError.set('Debe adjuntar el sustento en PDF.');
        this.errorMsg.set('Debe adjuntar el sustento en PDF.');
        return;
      }
      this.errorMsg.set('');
      this.fileError.set('');
      this.saving.set(true);
      const formData = this.buildFormData();
      const request$ =
        this.mode() === 'edit' && this.editingId()
          ? this.service.actualizar(this.editingId() as number, formData)
          : this.service.registrar(formData);
      request$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => this.handleSaveNext(res),
          error: (err) => this.handleSaveError(err),
        });
    }

    private handleSaveNext(res: { success?: boolean; error?: string; message?: string }): void {
      this.saving.set(false);
      if (!res.success) {
        const msg = res.error ?? res.message ?? 'No se pudo guardar el conocimiento.';
        this.errorMsg.set(msg);
        this.toast.error(msg);
        return;
      }
      const successMsg =
        res.message ??
        (this.mode() === 'edit' ? 'Conocimiento actualizado correctamente' : 'Conocimiento registrado correctamente');
      this.toast.success(successMsg);
      this.resetForm();
      this.mode.set('list');
      this.loadItems();
    }

    private handleSaveError(error: HttpErrorResponse): void {
      this.saving.set(false);
      const msg = this.extractApiError(error, 'No se pudo guardar el conocimiento.');
      this.errorMsg.set(msg);
      this.toast.error(msg);
    }
  
    onEliminar(item: PostulanteConocimiento): void {
      this.itemToDelete.set(item);
      this.showConfirmDelete.set(true);
    }

    onConfirmEliminar(): void {
      const item = this.itemToDelete();
      this.showConfirmDelete.set(false);
      this.itemToDelete.set(null);
      if (!item) return;

      this.service
        .eliminar(item.idConocimiento)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.toast.success(res.message ?? 'Conocimiento eliminado correctamente');
              this.loadItems();
              return;
            }
            this.toast.error(res.error ?? res.message ?? 'No se pudo eliminar el registro.');
          },
          error: (error: HttpErrorResponse) => {
            this.toast.error(this.extractApiError(error, 'No se pudo eliminar el registro.'));
          },
        });
    }
  
    onVerSustento(item: PostulanteConocimiento): void {
      this.service
        .descargarSustento(item.idConocimiento)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob) => {
            const objectUrl = URL.createObjectURL(blob);
            window.open(objectUrl, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
          },
          error: (error: HttpErrorResponse) => {
            this.toast.error(this.extractApiError(error, 'No se pudo abrir el sustento PDF.'));
          },
        });
    }
  
    getTipoDisplay(item: PostulanteConocimiento): string {
      if (item.tipoConocimiento === 'OFIMATICA' && item.tipoOfimatica) {
        return `${item.tipoConocimiento} - ${item.tipoOfimatica}`;
      }
      return item.tipoConocimiento ?? '';
    }

    formatFecha(value: string | null | undefined): string {
      if (!value) {
        return '';
      }
  
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
  
      return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    }
  
    private loadItems(): void {
      this.loading.set(true);
  
      this.service
        .listar()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.loading.set(false);
  
            if (res.success && res.data) {
              this.items.set(res.data);
              return;
            }
  
            this.items.set([]);
            this.toast.error(res.error ?? res.message ?? 'No se pudo cargar conocimientos.');
          },
          error: (error: HttpErrorResponse) => {
            this.loading.set(false);
            this.items.set([]);
            this.toast.error(
              this.extractApiError(error, 'No se pudo cargar conocimientos.'),
            );
          },
        });
    }
  
    private buildFormData(): FormData {
      const raw = this.form.getRawValue();
      const formData = new FormData();
      formData.append('tipoConocimiento', raw.tipoConocimiento);
      formData.append('descripcion', raw.descripcion);
      formData.append('nivel', raw.nivel);
      this.appendTipoOfimaticaIfNeeded(formData, raw);
      this.appendExtraFieldsIfNeeded(formData, raw);
      if (this.selectedFile) formData.append('archivo', this.selectedFile);
      return formData;
    }

    private appendTipoOfimaticaIfNeeded(formData: FormData, raw: ReturnType<typeof this.form.getRawValue>): void {
      if (raw.tipoConocimiento === 'OFIMATICA' && raw.tipoOfimatica?.trim()) {
        formData.append('tipoOfimatica', raw.tipoOfimatica.trim());
      }
    }

    private appendExtraFieldsIfNeeded(formData: FormData, raw: ReturnType<typeof this.form.getRawValue>): void {
      const tipo = raw.tipoConocimiento;
      if (tipo === 'OFIMATICA' || tipo === 'IDIOMA') return;
      if (raw.institucion?.trim()) formData.append('institucion', raw.institucion.trim());
      if (raw.horas != null) formData.append('horas', String(raw.horas));
      if (raw.fechaInicio) formData.append('fechaInicio', raw.fechaInicio);
      if (raw.fechaFin) formData.append('fechaFin', raw.fechaFin);
    }
  
    private resetForm(): void {
      this.form.reset({
        tipoConocimiento: '',
        tipoOfimatica: '',
        descripcion: '',
        nivel: '',
        institucion: '',
        horas: null,
        fechaInicio: '',
        fechaFin: '',
      });
  
      this.editingId.set(null);
      this.selectedFile = null;
      this.errorMsg.set('');
      this.fileError.set('');
      this.currentFileName.set('Ningún archivo seleccionado');
    }
  
    private dateRangeValidator(control: AbstractControl): ValidationErrors | null {
      const tipo = control.get('tipoConocimiento')?.value;
      if (tipo === 'OFIMATICA' || tipo === 'IDIOMA') {
        return null;
      }
      const fechaInicio = control.get('fechaInicio')?.value;
      const fechaFin = control.get('fechaFin')?.value;
  
      if ((!fechaInicio && fechaFin) || (fechaInicio && !fechaFin)) {
        return { datePairRequired: true };
      }
  
      if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
        return { invalidDateRange: true };
      }
  
      return null;
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