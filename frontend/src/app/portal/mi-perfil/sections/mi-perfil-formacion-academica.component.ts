import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
  import { HttpErrorResponse } from '@angular/common/http';
  import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
  import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
  
  import { ToastService } from '@core/services/toast.service';
  import { PostulanteFormacionAcademicaService } from '@core/services/postulante-formacion-academica.service';
  import { PostulanteFormacionAcademica } from '@shared/models/postulante-formacion-academica.model';
  
  type FormMode = 'list' | 'create' | 'edit';
  
  @Component({
    selector: 'app-mi-perfil-formacion-academica',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <div class="space-y-4 min-w-0 w-full">
        @if (mode() === 'list') {
          <div class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="bg-[#374151] px-4 py-3 sm:px-5 sm:py-3.5 text-sm font-semibold text-white flex items-center gap-3">
              <span>◉</span>
              <span>FORMACIÓN ACADÉMICA</span>
            </div>

            <div class="flex flex-col flex-1 min-h-0 p-4 sm:p-5 bg-white">
              <div class="mb-4 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  (click)="onNuevo()"
                  aria-label="Agregar nueva formación académica"
                  class="inline-flex items-center gap-2 rounded-md bg-[#5cb85c] px-3 py-2 text-xs sm:text-sm font-semibold text-white transition-all duration-200 hover:brightness-95 hover:shadow-md"
                >
                  <span>＋</span>
                  <span>Agregar</span>
                </button>
              </div>

              @if (loading()) {
                <div class="py-12 text-center text-gray-500 text-sm">Cargando formación académica...</div>
              } @else if (items().length === 0) {
                <div class="py-12 text-center text-gray-500 text-sm">No se encontraron registros de formación académica.</div>
              } @else {
                <!-- Vista móvil: tarjetas -->
                <div class="space-y-3 md:hidden">
                  @for (item of items(); track item.idFormacionAcademica; let i = $index) {
                    <div class="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-2">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                          <p class="text-xs font-medium text-gray-500 uppercase">{{ item.formacionAcademica }}</p>
                          <p class="text-sm font-semibold text-gray-800 break-words">{{ item.carrera }}</p>
                          <p class="text-xs text-gray-600 mt-0.5">{{ item.nivelAlcanzado }}</p>
                        </div>
                        <span class="flex-shrink-0 text-xs font-medium text-gray-400">#{{ i + 1 }}</span>
                      </div>
                      <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-600">
                        <span class="break-words">{{ item.centroEstudios }}</span>
                        <span>{{ formatFecha(item.fechaExpedicion) || '—' }}</span>
                      </div>
                      <div class="flex gap-2 pt-2 border-t border-gray-200">
                        <button type="button" (click)="onVerSustento(item)" [attr.aria-label]="'Ver sustento PDF de ' + item.carrera"
                          class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-[#1F2133] bg-white border border-gray-300 hover:bg-gray-50">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7zm0 1.5L18.5 8H14zM8 12h8v1.5H8zm0 3h8v1.5H8zm0-6h4v1.5H8z"/></svg>
                          Ver
                        </button>
                        <button type="button" (click)="onEditar(item)" [attr.aria-label]="'Editar formación académica ' + item.carrera"
                          class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-[#1F2133] bg-white border border-gray-300 hover:bg-gray-50">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75l11-11.03-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0L15.13 5.12l3.75 3.75z"/></svg>
                          Editar
                        </button>
                        <button type="button" (click)="onEliminar(item)" [attr.aria-label]="'Eliminar formación académica ' + item.carrera"
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
                        <th class="border-r border-white/20 px-3 py-2 text-left font-semibold">Formación</th>
                        <th class="border-r border-white/20 px-3 py-2 text-left font-semibold">Nivel</th>
                        <th class="border-r border-white/20 px-3 py-2 text-left font-semibold">Carrera</th>
                        <th class="border-r border-white/20 px-3 py-2 text-left font-semibold">Centro Estudios</th>
                        <th class="border-r border-white/20 px-2 py-2 text-center font-semibold w-24">F. Expedición</th>
                        <th class="border-r border-white/20 px-2 py-2 text-center font-semibold w-20">Sustento</th>
                        <th class="border-r border-white/20 px-2 py-2 text-center font-semibold w-20">Editar</th>
                        <th class="px-2 py-2 text-center font-semibold w-20">Eliminar</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of items(); track item.idFormacionAcademica; let i = $index) {
                        <tr class="border-t border-gray-200 text-gray-800 hover:bg-gray-50/50 transition-colors">
                          <td class="px-2 py-2 text-center">{{ i + 1 }}</td>
                          <td class="min-w-0 px-3 py-2 uppercase break-words text-[10px] align-top">{{ item.formacionAcademica }}</td>
                          <td class="min-w-0 px-3 py-2 uppercase break-words text-[10px] align-top">{{ item.nivelAlcanzado }}</td>
                          <td class="min-w-0 px-3 py-2 uppercase break-words text-[10px] align-top">{{ item.carrera }}</td>
                          <td class="min-w-0 px-3 py-2 uppercase break-words text-[10px] align-top">{{ item.centroEstudios || '—' }}</td>
                          <td class="px-2 py-2 text-center whitespace-nowrap text-[10px]">{{ formatFecha(item.fechaExpedicion) || '—' }}</td>
                          <td class="px-2 py-2 text-center">
                            <button type="button" (click)="onVerSustento(item)" [attr.aria-label]="'Ver sustento PDF de ' + item.carrera"
                              class="inline-flex items-center justify-center rounded-md p-2 text-[#1F2133] transition-colors hover:bg-gray-100" title="Ver sustento">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7zm0 1.5L18.5 8H14zM8 12h8v1.5H8zm0 3h8v1.5H8zm0-6h4v1.5H8z"/></svg>
                            </button>
                          </td>
                          <td class="px-2 py-2 text-center">
                            <button type="button" (click)="onEditar(item)" [attr.aria-label]="'Editar formación académica ' + item.carrera"
                              class="inline-flex items-center justify-center rounded-md p-2 text-[#1F2133] transition-colors hover:bg-gray-100" title="Editar">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75l11-11.03-3.75-3.75zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0L15.13 5.12l3.75 3.75z"/></svg>
                            </button>
                          </td>
                          <td class="px-2 py-2 text-center">
                            <button type="button" (click)="onEliminar(item)" [attr.aria-label]="'Eliminar formación académica ' + item.carrera"
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
              <span>{{ mode() === 'create' ? 'Nueva Formación Académica' : 'Editar Formación Académica' }}</span>
            </div>
  
            <form [formGroup]="form" (ngSubmit)="onGuardar()" class="space-y-6 bg-white p-4 sm:p-5">
              <fieldset class="border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
                <legend class="px-2 text-sm text-gray-800 font-medium">Formación Académica</legend>
  
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="label-field text-[11px]">Formación Académica (*)</label>
                    <select formControlName="formacionAcademica" class="input-field text-[11px]">
                      <option value="">-- SELECCIONAR --</option>
                      @for (item of formacionAcademicaOptions; track item) {
                        <option [value]="item">{{ item }}</option>
                      }
                    </select>
                    @if (form.controls.formacionAcademica.touched && form.controls.formacionAcademica.errors) {
                      <span class="error-text text-[10px]">Seleccione la formación académica</span>
                    }
                  </div>
  
                  <div>
                    <label class="label-field text-[11px]">Nivel Alcanzado (*)</label>
                    <select formControlName="nivelAlcanzado" class="input-field text-[11px]">
                      <option value="">-- SELECCIONAR --</option>
                      @for (item of nivelAlcanzadoOptions; track item) {
                        <option [value]="item">{{ item }}</option>
                      }
                    </select>
                    @if (form.controls.nivelAlcanzado.touched && form.controls.nivelAlcanzado.errors) {
                      <span class="error-text text-[10px]">Seleccione el nivel alcanzado</span>
                    }
                  </div>
  
                  <div>
                    <label class="label-field text-[11px]">Carrera (*)</label>
                    <input formControlName="carrera" class="input-field text-[11px] uppercase" maxlength="200" />
                    @if (form.controls.carrera.touched && form.controls.carrera.errors) {
                      <span class="error-text text-[10px]">Ingrese la carrera</span>
                    }
                  </div>
                </div>
  
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-2">
                    <label class="label-field text-[11px]">Universidad / Instituto / Centro de Estudios (*)</label>
                    <input formControlName="centroEstudios" class="input-field text-[11px] uppercase" maxlength="250" />
                    @if (form.controls.centroEstudios.touched && form.controls.centroEstudios.errors) {
                      <span class="error-text text-[10px]">Ingrese el centro de estudios</span>
                    }
                  </div>
  
                  <div>
                    <label class="label-field text-[11px]">Fecha de Expedición del Grado (*)</label>
                    <input formControlName="fechaExpedicion" type="date" class="input-field text-[11px]" />
                    @if (form.controls.fechaExpedicion.touched && form.controls.fechaExpedicion.errors) {
                      <span class="error-text text-[10px]">Ingrese la fecha de expedición</span>
                    }
                  </div>
                </div>
  
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="md:col-span-2">
                    <label class="label-field text-[11px]">
                      Adjuntar Documento (*)
                      <span class="text-[9px] text-red-500">(Archivos permitidos: .pdf)</span>
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      aria-label="Adjuntar documento PDF de sustento"
                      class="block w-full text-[11px] text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-white file:px-2 file:py-1 file:text-[11px]"
                      (change)="onFileSelected($event)"
                    />
                    <div class="mt-2 text-[11px] text-gray-500">
                      {{ currentFileName() }}
                    </div>
                    @if (fileError()) {
                      <span class="error-text text-[10px]">{{ fileError() }}</span>
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
                  aria-label="Guardar formación académica"
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
                  aria-label="Volver a la lista de formación académica"
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
          title="¿Eliminar formación académica?"
          [message]="confirmDeleteMessage()"
          confirmText="Sí, eliminar"
          [confirmDanger]="true"
          (confirm)="onConfirmEliminar()"
          (cancel)="showConfirmDelete.set(false); itemToDelete.set(null)" />
      </div>
    `,
  })
  export class MiPerfilFormacionAcademicaComponent {
    private readonly fb = inject(FormBuilder);
    private readonly service = inject(PostulanteFormacionAcademicaService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);
  
    readonly formacionAcademicaOptions = [
      'UNIVERSITARIA',
      'TÉCNICA',
      'MAESTRÍA',
      'DOCTORADO',
    ];
  
    readonly nivelAlcanzadoOptions = [
      'EGRESADO',
      'BACHILLER',
      'TITULADO',
      'MAESTRO',
      'DOCTOR',
    ];
  
    readonly form = this.fb.nonNullable.group({
      formacionAcademica: ['', [Validators.required, Validators.maxLength(50)]],
      nivelAlcanzado: ['', [Validators.required, Validators.maxLength(50)]],
      carrera: ['', [Validators.required, Validators.maxLength(200)]],
      centroEstudios: ['', [Validators.required, Validators.maxLength(250)]],
      fechaExpedicion: ['', [Validators.required]],
    });
  
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly mode = signal<FormMode>('list');
    readonly items = signal<PostulanteFormacionAcademica[]>([]);
    readonly editingId = signal<number | null>(null);
    readonly errorMsg = signal('');
    readonly fileError = signal('');
    readonly currentFileName = signal('Ningún archivo seleccionado');
    readonly showConfirmDelete = signal(false);
    readonly itemToDelete = signal<PostulanteFormacionAcademica | null>(null);
    readonly confirmDeleteMessage = computed(() => {
      const item = this.itemToDelete();
      if (!item) return '';
      return `¿Desea eliminar la formación académica «${item.carrera}»? Esta acción no se puede deshacer.`;
    });

    private selectedFile: File | null = null;
  
    constructor() {
      this.loadItems();
    }
  
    onNuevo(): void {
      this.resetForm();
      this.mode.set('create');
    }
  
    onEditar(item: PostulanteFormacionAcademica): void {
      this.form.patchValue({
        formacionAcademica: item.formacionAcademica ?? '',
        nivelAlcanzado: item.nivelAlcanzado ?? '',
        carrera: item.carrera ?? '',
        centroEstudios: item.centroEstudios ?? '',
        fechaExpedicion: item.fechaExpedicion ?? '',
      });
  
      this.editingId.set(item.idFormacionAcademica);
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
  
      this.selectedFile = file;
      this.currentFileName.set(file.name);
      this.fileError.set('');
    }
  
    onGuardar(): void {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        this.errorMsg.set('Complete correctamente los campos obligatorios de Formación Académica.');
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
          next: (res) => {
            this.saving.set(false);
  
            if (!res.success) {
              const backendMsg = res.error ?? res.message ?? 'No se pudo guardar la formación académica.';
              this.errorMsg.set(backendMsg);
              this.toast.error(backendMsg);
              return;
            }
  
            this.toast.success(
              res.message ??
                (this.mode() === 'edit'
                  ? 'Formación académica actualizada correctamente'
                  : 'Formación académica registrada correctamente'),
            );
  
            this.resetForm();
            this.mode.set('list');
            this.loadItems();
          },
          error: (error: HttpErrorResponse) => {
            this.saving.set(false);
            const backendMsg = this.extractApiError(
              error,
              'No se pudo guardar la formación académica.',
            );
            this.errorMsg.set(backendMsg);
            this.toast.error(backendMsg);
          },
        });
    }
  
    onEliminar(item: PostulanteFormacionAcademica): void {
      this.itemToDelete.set(item);
      this.showConfirmDelete.set(true);
    }

    onConfirmEliminar(): void {
      const item = this.itemToDelete();
      this.showConfirmDelete.set(false);
      this.itemToDelete.set(null);
      if (!item) return;

      this.service
        .eliminar(item.idFormacionAcademica)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.toast.success(res.message ?? 'Formación académica eliminada correctamente');
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
  
    onVerSustento(item: PostulanteFormacionAcademica): void {
      this.service
        .descargarSustento(item.idFormacionAcademica)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob) => {
            const objectUrl = URL.createObjectURL(blob);
            window.open(objectUrl, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
          },
          error: (error: HttpErrorResponse | Error) => {
            const msg = error instanceof Error
              ? error.message
              : this.extractApiError(error, 'No se pudo abrir el sustento PDF.');
            this.toast.error(msg);
          },
        });
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
            this.toast.error(res.error ?? res.message ?? 'No se pudo cargar la formación académica.');
          },
          error: (error: HttpErrorResponse) => {
            this.loading.set(false);
            this.items.set([]);
            this.toast.error(
              this.extractApiError(error, 'No se pudo cargar la formación académica.'),
            );
          },
        });
    }
  
    private buildFormData(): FormData {
      const raw = this.form.getRawValue();
      const formData = new FormData();
  
      formData.append('formacionAcademica', raw.formacionAcademica);
      formData.append('nivelAlcanzado', raw.nivelAlcanzado);
      formData.append('carrera', raw.carrera);
      formData.append('centroEstudios', raw.centroEstudios);
      formData.append('fechaExpedicion', raw.fechaExpedicion);
  
      if (this.selectedFile) {
        formData.append('archivo', this.selectedFile);
      }
  
      return formData;
    }
  
    private resetForm(): void {
      this.form.reset({
        formacionAcademica: '',
        nivelAlcanzado: '',
        carrera: '',
        centroEstudios: '',
        fechaExpedicion: '',
      });
  
      this.editingId.set(null);
      this.selectedFile = null;
      this.errorMsg.set('');
      this.fileError.set('');
      this.currentFileName.set('Ningún archivo seleccionado');
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