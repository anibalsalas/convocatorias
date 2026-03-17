import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { HttpErrorResponse } from '@angular/common/http';
  import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
  } from '@angular/forms';
  import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
  
  import { ToastService } from '@core/services/toast.service';
  import { PostulanteExperienciaService } from '@core/services/postulante-experiencia.service';
  import { PostulanteExperiencia } from '@shared/models/postulante-experiencia.model';
  import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
  
  type FormMode = 'list' | 'create' | 'edit';
  
  @Component({
    selector: 'app-mi-perfil-experiencia',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './mi-perfil-experiencia.component.html',
    styleUrls: ['./mi-perfil-experiencia.component.css'],
  })
  export class MiPerfilExperienciaComponent {
    private readonly fb = inject(FormBuilder);
    private readonly service = inject(PostulanteExperienciaService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);
  
    readonly tipoExperienciaOptions = [
      { value: 'GENERAL', label: 'GENERAL' },
      { value: 'ESPECIFICA', label: 'ESPECÍFICA' },
    ];
  
    readonly tipoSectorOptions = [
      { value: 'PUBLICO', label: 'PÚBLICO' },
      { value: 'PRIVADO', label: 'PRIVADO' },
    ];
  
    readonly nivelOptions = [
      'AUXILIAR / ASISTENTE',
      'ANALISTA',
      'ESPECIALISTA',
      'SUPERVISOR O COORDINADOR',
      'JEFE DE ÁREA O DEPARTAMENTO',
      'GERENTE / DIRECTOR',
    ];
  
    readonly form = this.fb.nonNullable.group(
      {
        tipoExperiencia: ['', [Validators.required, Validators.maxLength(20)]],
        tipoSector: ['', [Validators.required, Validators.maxLength(20)]],
        institucion: ['', [Validators.required, Validators.maxLength(250)]],
        puesto: ['', [Validators.required, Validators.maxLength(250)]],
        nivel: ['', [Validators.required, Validators.maxLength(120)]],
        funciones: ['', [Validators.required, Validators.maxLength(4000)]],
        fechaInicio: ['', [Validators.required]],
        fechaFin: ['', [Validators.required]],
      },
      { validators: [this.dateRangeValidator] },
    );
  
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly mode = signal<FormMode>('list');
    readonly items = signal<PostulanteExperiencia[]>([]);
    readonly editingId = signal<number | null>(null);
    readonly errorMsg = signal('');
    readonly fileError = signal('');
    readonly currentFileName = signal('Ningún archivo seleccionado');
    readonly showConfirmDelete = signal(false);
    readonly itemToDelete = signal<PostulanteExperiencia | null>(null);
    readonly confirmDeleteMessage = computed(() => {
      const item = this.itemToDelete();
      if (!item) return '';
      return `¿Desea eliminar la experiencia «${item.puesto}»? Esta acción no se puede deshacer.`;
    });
  
    readonly generalItems = computed(() =>
      this.items().filter((item) => item.tipoExperiencia === 'GENERAL'),
    );
  
    readonly specificItems = computed(() =>
      this.items().filter((item) => item.tipoExperiencia === 'ESPECIFICA'),
    );
  
    readonly specificPublicItems = computed(() =>
      this.specificItems().filter((item) => item.tipoSector === 'PUBLICO'),
    );
  
    private selectedFile: File | null = null;
  
    constructor() {
      this.loadItems();
    }
  
    onNuevo(): void {
      this.resetForm();
      this.mode.set('create');
    }
  
    onEditar(item: PostulanteExperiencia): void {
      this.form.patchValue({
        tipoExperiencia: item.tipoExperiencia ?? '',
        tipoSector: item.tipoSector ?? '',
        institucion: item.institucion ?? '',
        puesto: item.puesto ?? '',
        nivel: item.nivel ?? '',
        funciones: item.funciones ?? '',
        fechaInicio: item.fechaInicio ?? '',
        fechaFin: item.fechaFin ?? '',
      });
  
      this.editingId.set(item.idExperiencia);
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
        this.errorMsg.set('Complete correctamente los campos obligatorios de Experiencia.');
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
              const backendMsg =
                res.error ?? res.message ?? 'No se pudo guardar la experiencia.';
              this.errorMsg.set(backendMsg);
              this.toast.error(backendMsg);
              return;
            }
  
            this.toast.success(
              res.message ??
                (this.mode() === 'edit'
                  ? 'Experiencia actualizada correctamente'
                  : 'Experiencia registrada correctamente'),
            );
  
            this.resetForm();
            this.mode.set('list');
            this.loadItems();
          },
          error: (error: HttpErrorResponse) => {
            this.saving.set(false);
            const backendMsg = this.extractApiError(
              error,
              'No se pudo guardar la experiencia.',
            );
            this.errorMsg.set(backendMsg);
            this.toast.error(backendMsg);
          },
        });
    }
  
    onEliminar(item: PostulanteExperiencia): void {
      this.itemToDelete.set(item);
      this.showConfirmDelete.set(true);
    }

    onConfirmEliminar(): void {
      const item = this.itemToDelete();
      this.showConfirmDelete.set(false);
      this.itemToDelete.set(null);
      if (!item) return;

      this.service
        .eliminar(item.idExperiencia)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.toast.success(res.message ?? 'Experiencia eliminada correctamente');
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
  
    onVerSustento(item: PostulanteExperiencia): void {
      this.service
        .descargarSustento(item.idExperiencia)
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
  
    getPeriodLabel(fechaInicio: string, fechaFin: string): string {
      const period = this.calculateInclusivePeriod(fechaInicio, fechaFin);
      return `${period.years} año(s) - ${period.months} mes(es) - ${period.days} día(s)`;
    }
  
    getTotalPeriodLabel(items: PostulanteExperiencia[]): string {
      const totalDays = items.reduce(
        (acc, item) => acc + this.calculateInclusivePeriod(item.fechaInicio, item.fechaFin).totalDays,
        0,
      );
  
      const period = this.breakdownFromTotalDays(totalDays);
      return `${period.years} año(s) - ${period.months} mes(es) - ${period.days} día(s)`;
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
            this.toast.error(res.error ?? res.message ?? 'No se pudo cargar experiencia.');
          },
          error: (error: HttpErrorResponse) => {
            this.loading.set(false);
            this.items.set([]);
            this.toast.error(this.extractApiError(error, 'No se pudo cargar experiencia.'));
          },
        });
    }
  
    private buildFormData(): FormData {
      const raw = this.form.getRawValue();
      const formData = new FormData();
  
      formData.append('tipoExperiencia', raw.tipoExperiencia);
      formData.append('tipoSector', raw.tipoSector);
      formData.append('institucion', raw.institucion);
      formData.append('puesto', raw.puesto);
      formData.append('nivel', raw.nivel);
      formData.append('funciones', raw.funciones);
      formData.append('fechaInicio', raw.fechaInicio);
      formData.append('fechaFin', raw.fechaFin);
  
      if (this.selectedFile) {
        formData.append('archivo', this.selectedFile);
      }
  
      return formData;
    }
  
    private resetForm(): void {
      this.form.reset({
        tipoExperiencia: '',
        tipoSector: '',
        institucion: '',
        puesto: '',
        nivel: '',
        funciones: '',
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
      const fechaInicio = control.get('fechaInicio')?.value;
      const fechaFin = control.get('fechaFin')?.value;
  
      if (!fechaInicio || !fechaFin) {
        return null;
      }
  
      if (fechaFin < fechaInicio) {
        return { invalidDateRange: true };
      }
  
      return null;
    }
  
    private parseDate(value: string | null | undefined): Date | null {
      if (!value) {
        return null;
      }
  
      const parts = value.split('-').map(Number);
      if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
        return null;
      }
  
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  
    private addDays(date: Date, days: number): Date {
      const copy = new Date(date);
      copy.setDate(copy.getDate() + days);
      return copy;
    }
  
    private addYears(date: Date, years: number): Date {
      const copy = new Date(date);
      copy.setFullYear(copy.getFullYear() + years);
      return copy;
    }
  
    private addMonths(date: Date, months: number): Date {
      const copy = new Date(date);
      copy.setMonth(copy.getMonth() + months);
      return copy;
    }
  
    private diffDays(start: Date, endExclusive: Date): number {
      const msPerDay = 24 * 60 * 60 * 1000;
      return Math.max(0, Math.floor((endExclusive.getTime() - start.getTime()) / msPerDay));
    }
  
    private calculateInclusivePeriod(fechaInicio: string, fechaFin: string): {
      years: number;
      months: number;
      days: number;
      totalDays: number;
    } {
      const start = this.parseDate(fechaInicio);
      const end = this.parseDate(fechaFin);
  
      if (!start || !end || end < start) {
        return { years: 0, months: 0, days: 0, totalDays: 0 };
      }
  
      const endExclusive = this.addDays(end, 1);
      let cursor = new Date(start);
      let years = 0;
      let months = 0;
  
      while (this.addYears(cursor, 1) <= endExclusive) {
        cursor = this.addYears(cursor, 1);
        years++;
      }
  
      while (this.addMonths(cursor, 1) <= endExclusive) {
        cursor = this.addMonths(cursor, 1);
        months++;
      }
  
      const days = this.diffDays(cursor, endExclusive);
      const totalDays = this.diffDays(start, endExclusive);
  
      return { years, months, days, totalDays };
    }
  
    private breakdownFromTotalDays(totalDays: number): {
      years: number;
      months: number;
      days: number;
    } {
      if (totalDays <= 0) {
        return { years: 0, months: 0, days: 0 };
      }
  
      const start = new Date(2000, 0, 1);
      const endExclusive = this.addDays(start, totalDays);
      let cursor = new Date(start);
      let years = 0;
      let months = 0;
  
      while (this.addYears(cursor, 1) <= endExclusive) {
        cursor = this.addYears(cursor, 1);
        years++;
      }
  
      while (this.addMonths(cursor, 1) <= endExclusive) {
        cursor = this.addMonths(cursor, 1);
        months++;
      }
  
      const days = this.diffDays(cursor, endExclusive);
      return { years, months, days };
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