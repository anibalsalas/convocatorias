import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { HttpErrorResponse } from '@angular/common/http';
  import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
  import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
  
  import { ToastService } from '@core/services/toast.service';
  import { PostulanteDocumentoService } from '@core/services/postulante-documento.service';
  import { PostulanteDocumento } from '@shared/models/postulante-documento.model';
  import { ApiResponse } from '@shared/models/api-response.model';
  import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
  
  type FormMode = 'list' | 'create';
  
  @Component({
    selector: 'app-mi-perfil-documentos',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './mi-perfil-documentos.component.html',
    styleUrls: ['./mi-perfil-documentos.component.css'],
  })
  export class MiPerfilDocumentosComponent {
    private readonly fb = inject(FormBuilder);
    private readonly service = inject(PostulanteDocumentoService);
    private readonly toast = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);
  
    readonly tipoDocumentoOptions = [
      'DNI O CARNET DE EXTRANJERÍA',
      'RUC (ACTIVO Y HABIDO)',
      'COLEGIATURA PROFESIONAL',
      'HABILITACIÓN PROFESIONAL',
      'DISCAPACIDAD',
      'DEPORTISTA CALIFICADO DE ALTO NIVEL',
      'LICENCIADO DE LAS FUERZAS ARMADAS',
      'SERUMS',
      'LICENCIA DE CONDUCIR',
      'RÉCORD DEL CONDUCTOR SIN PAPELETAS',
      'DECLARACIÓN JURADA DE NO TENER ANTECEDENTES POLICIALES',
      'CERTIFICADO DE SALUD',
      'OTROS',
    ];
  
    readonly form = this.fb.nonNullable.group({
      tipoDocumento: ['', [Validators.required, Validators.maxLength(150)]],
    });
  
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly mode = signal<FormMode>('list');
    readonly items = signal<PostulanteDocumento[]>([]);
    readonly errorMsg = signal('');
    readonly fileError = signal('');
    readonly currentFileName = signal('Ningún archivo seleccionado');
    readonly showConfirmDelete = signal(false);
    readonly itemToDelete = signal<PostulanteDocumento | null>(null);
    readonly confirmDeleteMessage = computed(() => {
      const item = this.itemToDelete();
      if (!item) return '';
      return `¿Desea eliminar el documento «${item.tipoDocumento}»? Esta acción no se puede deshacer.`;
    });
  
    private selectedFile: File | null = null;
  
    constructor() {
      this.loadItems();
    }
  
    onNuevo(): void {
      this.resetForm();
      this.mode.set('create');
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

      if (file.size > 10 * 1024 * 1024) {
        this.selectedFile = null;
        this.currentFileName.set('Ningún archivo seleccionado');
        this.fileError.set('El archivo no debe superar 10 MB.');
        this.toast.error('El archivo no debe superar 10 MB.');
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
        this.errorMsg.set('Complete correctamente los campos obligatorios de Documentos.');
        return;
      }
  
      if (!this.selectedFile) {
        this.fileError.set('Debe adjuntar el documento en PDF.');
        this.errorMsg.set('Debe adjuntar el documento en PDF.');
        return;
      }
  
      this.errorMsg.set('');
      this.fileError.set('');
      this.saving.set(true);
  
      const formData = new FormData();
      formData.append('tipoDocumento', this.form.controls.tipoDocumento.value);
      formData.append('archivo', this.selectedFile);
  
      this.service
        .registrar(formData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res: ApiResponse<PostulanteDocumento>) => {
            this.saving.set(false);
  
            if (!res.success) {
              const backendMsg = res.error ?? res.message ?? 'No se pudo guardar el documento.';
              this.errorMsg.set(backendMsg);
              this.toast.error(backendMsg);
              return;
            }
  
            this.toast.success(res.message ?? 'Documento registrado correctamente');
            this.resetForm();
            this.mode.set('list');
            this.loadItems();
          },
          error: (error: HttpErrorResponse) => {
            this.saving.set(false);
            const backendMsg = this.extractApiError(error, 'No se pudo guardar el documento.');
            this.errorMsg.set(backendMsg);
            this.toast.error(backendMsg);
          },
        });
    }
  
    onEliminar(item: PostulanteDocumento): void {
      this.itemToDelete.set(item);
      this.showConfirmDelete.set(true);
    }

    onConfirmEliminar(): void {
      const item = this.itemToDelete();
      this.showConfirmDelete.set(false);
      this.itemToDelete.set(null);
      if (!item) return;

      this.service
        .eliminar(item.idDocumento)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res: ApiResponse<void>) => {
            if (res.success) {
              this.toast.success(res.message ?? 'Documento eliminado correctamente');
              this.loadItems();
              return;
            }
            this.toast.error(res.error ?? res.message ?? 'No se pudo eliminar el documento.');
          },
          error: (error: HttpErrorResponse) => {
            this.toast.error(this.extractApiError(error, 'No se pudo eliminar el documento.'));
          },
        });
    }
  
    onVerSustento(item: PostulanteDocumento): void {
      this.service
        .descargarSustento(item.idDocumento)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob: Blob) => {
            const objectUrl = URL.createObjectURL(blob);
            window.open(objectUrl, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
          },
          error: (error: HttpErrorResponse) => {
            this.toast.error(this.extractApiError(error, 'No se pudo abrir el sustento PDF.'));
          },
        });
    }
  
    private loadItems(): void {
      this.loading.set(true);
  
      this.service
        .listar()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res: ApiResponse<PostulanteDocumento[]>) => {
            this.loading.set(false);
  
            if (res.success && res.data) {
              this.items.set(res.data);
              return;
            }
  
            this.items.set([]);
            this.toast.error(res.error ?? res.message ?? 'No se pudo cargar documentos.');
          },
          error: (error: HttpErrorResponse) => {
            this.loading.set(false);
            this.items.set([]);
            this.toast.error(this.extractApiError(error, 'No se pudo cargar documentos.'));
          },
        });
    }
  
    private resetForm(): void {
      this.form.reset({
        tipoDocumento: '',
      });
  
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