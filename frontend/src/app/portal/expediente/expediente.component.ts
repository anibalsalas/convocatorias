import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';

import { PostulacionService } from '@core/services/postulacion.service';
import { ToastService } from '@core/services/toast.service';
import { PostulanteFormacionAcademicaService } from '@core/services/postulante-formacion-academica.service';
import { PostulanteConocimientoService } from '@core/services/postulante-conocimiento.service';
import { PostulanteExperienciaService } from '@core/services/postulante-experiencia.service';
import { PostulanteDocumentoService } from '@core/services/postulante-documento.service';
import { ExpedienteItem, PostulacionItem } from '@shared/models/postulacion.model';

interface SupportSummary {
  formaciones: number;
  conocimientos: number;
  experiencias: number;
  documentos: number;
}

interface DocumentTypeOption {
  value: string;
  label: string;
}

const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  { value: 'CURRICULUM', label: 'Currículum documentado' },
  { value: 'DECLARACION_JURADA', label: 'Declaración jurada / anexos' },
  { value: 'IDENTIDAD', label: 'Documento de identidad' },
  { value: 'SUSTENTO_COMPLEMENTARIO', label: 'Sustento complementario' },
  { value: 'OTRO', label: 'Otro documento' },
];

@Component({
  selector: 'app-expediente',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './expediente.component.html',
  styleUrl: './expediente.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpedienteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly postulacionService = inject(PostulacionService);
  private readonly toast = inject(ToastService);
  private readonly formacionService = inject(PostulanteFormacionAcademicaService);
  private readonly conocimientoService = inject(PostulanteConocimientoService);
  private readonly experienciaService = inject(PostulanteExperienciaService);
  private readonly documentoService = inject(PostulanteDocumentoService);

  readonly postId = signal<number | null>(null);
  readonly loadingPostulacion = signal(false);
  readonly loadingExpediente = signal(false);
  readonly loadingSupport = signal(false);
  readonly uploading = signal(false);
  readonly finalizing = signal(false);
  readonly showFinalizeModal = signal(false);
  readonly deleting = signal<number | null>(null);

  readonly postulacion = signal<PostulacionItem | null>(null);
  readonly expedienteItems = signal<ExpedienteItem[]>([]);
  readonly supportSummary = signal<SupportSummary>({
    formaciones: 0,
    conocimientos: 0,
    experiencias: 0,
    documentos: 0,
  });

  readonly selectedTipoDocumento = signal<string>(DOCUMENT_TYPE_OPTIONS[0].value);
  readonly selectedFile = signal<File | null>(null);
  readonly selectedFileHash = signal<string>('');

  readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;

  /** Set de tipos ya cargados en el expediente — para bloquear duplicados */
  readonly tiposYaUsados = computed(() =>
    new Set(this.expedienteItems().map(i => i.tipoDocumento))
  );

  /** Opciones del select filtradas: excluye tipos ya presentes en el expediente */
  readonly documentTypeOptionsDisponibles = computed(() =>
    DOCUMENT_TYPE_OPTIONS.filter(o => !this.tiposYaUsados().has(o.value))
  );

  readonly totalSupportItems = computed(() => {
    const summary = this.supportSummary();
    return (
      summary.formaciones +
      summary.conocimientos +
      summary.experiencias +
      summary.documentos
    );
  });

  readonly totalExpedientes = computed(
    () => this.postulacion()?.totalExpedientes ?? this.expedienteItems().length,
  );

  readonly expedienteFinalizado = computed(
    () => this.postulacion()?.estadoExpediente === 'EXPEDIENTE COMPLETO',
  );

  readonly canFinalizeExpediente = computed(
    () => this.totalExpedientes() > 0 && !this.expedienteFinalizado(),
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('idPost'));
    if (!id) {
      this.toast.error('No se pudo identificar la postulación.');
      return;
    }

    this.postId.set(id);
    this.loadPostulacion();
    this.loadExpediente();
    this.loadSupportSummary();
  }

  loadPostulacion(): void {
    const idPost = this.postId();
    if (!idPost) {
      return;
    }

    this.loadingPostulacion.set(true);

    this.postulacionService
      .obtenerMiPostulacion(idPost)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingPostulacion.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.postulacion.set(response.data);
        },
        error: () => {
          this.postulacion.set(null);
          this.toast.error('No se pudo obtener el estado de la postulación.');
        },
      });
  }

  loadExpediente(): void {
    const idPost = this.postId();
    if (!idPost) {
      return;
    }

    this.loadingExpediente.set(true);

    this.postulacionService
      .listarExpediente(idPost)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingExpediente.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.expedienteItems.set(response.data ?? []);
        },
        error: () => {
          this.expedienteItems.set([]);
          this.toast.error('No se pudo obtener el expediente de la postulación.');
        },
      });
  }

  loadSupportSummary(): void {
    this.loadingSupport.set(true);

    forkJoin({
      formaciones: this.formacionService.listar(),
      conocimientos: this.conocimientoService.listar(),
      experiencias: this.experienciaService.listar(),
      documentos: this.documentoService.listar(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingSupport.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.supportSummary.set({
            formaciones: response.formaciones.data?.length ?? 0,
            conocimientos: response.conocimientos.data?.length ?? 0,
            experiencias: response.experiencias.data?.length ?? 0,
            documentos: response.documentos.data?.length ?? 0,
          });
        },
        error: () => {
          this.supportSummary.set({
            formaciones: 0,
            conocimientos: 0,
            experiencias: 0,
            documentos: 0,
          });
          this.toast.warning('No se pudo cargar el resumen de sustentos desde Mi Perfil.');
        },
      });
  }

  async onFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    await this.prepareSelectedFile(file);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const file = event.dataTransfer?.files?.item(0) ?? null;
    await this.prepareSelectedFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.selectedFileHash.set('');
  }

  uploadSelectedFile(): void {
    const idPost = this.postId();
    const file = this.selectedFile();

    if (this.expedienteFinalizado()) {
      this.toast.warning('El expediente ya fue finalizado y no admite nuevas cargas.');
      return;
    }

    if (!idPost || !file) {
      this.toast.warning('Seleccione un archivo antes de cargarlo.');
      return;
    }

    this.uploading.set(true);

    this.postulacionService
      .cargarExpediente(idPost, this.selectedTipoDocumento(), file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.uploading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.toast.success(
            response.message || 'Documento cargado al expediente correctamente.',
          );
          this.clearSelectedFile();
          this.loadExpediente();
          this.loadPostulacion();
          // Resetear select al primer tipo disponible (excluye el recién subido)
          const uploadedTipo = this.selectedTipoDocumento();
          const siguiente = DOCUMENT_TYPE_OPTIONS.find(
            o => o.value !== uploadedTipo && !this.tiposYaUsados().has(o.value)
          );
          if (siguiente) this.selectedTipoDocumento.set(siguiente.value);
        },
        error: () => {
          this.toast.error('No se pudo cargar el archivo al expediente.');
        },
      });
  }

  openFinalizeModal(): void {
    if (!this.canFinalizeExpediente()) {
      this.toast.warning('Debe cargar al menos un documento antes de finalizar el expediente.');
      return;
    }

    this.showFinalizeModal.set(true);
  }

  closeFinalizeModal(): void {
    this.showFinalizeModal.set(false);
  }

  confirmFinalizeExpediente(): void {
    const idPost = this.postId();
    if (!idPost || !this.canFinalizeExpediente()) {
      return;
    }

    this.finalizing.set(true);

    this.postulacionService
      .finalizarExpediente(idPost)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.finalizing.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.postulacion.set(response.data);
          this.showFinalizeModal.set(false);
          this.toast.success(
            response.message || 'Expediente finalizado correctamente.',
          );
          this.loadPostulacion();
          this.loadExpediente();
        },
        error: () => {
          this.toast.error('No se pudo finalizar el expediente.');
        },
      });
  }

  estadoPostulacionVisible(): string {
    return this.postulacion()?.estadoPostulacionVisible || 'REGISTRADO';
  }

  estadoPostulacionClass(): string {
    return this.estadoPostulacionVisible() === 'POSTULACIÓN EXITOSA'
      ? 'status-badge status-badge--success'
      : 'status-badge status-badge--registered';
  }

  estadoExpedienteLabel(): string {
    return this.postulacion()?.estadoExpediente || 'EXPEDIENTE PENDIENTE';
  }

  estadoExpedienteClass(): string {
    switch (this.estadoExpedienteLabel()) {
      case 'EXPEDIENTE COMPLETO':
        return 'status-badge status-badge--complete';
      case 'EXPEDIENTE EN CARGA':
        return 'status-badge status-badge--progress';
      default:
        return 'status-badge status-badge--pending';
    }
  }

  resumenEstadoTexto(): string {
    switch (this.estadoExpedienteLabel()) {
      case 'EXPEDIENTE COMPLETO':
        return 'Su expediente fue finalizado correctamente. La postulación quedó lista para validación y filtro de requisitos mínimos.';
      case 'EXPEDIENTE EN CARGA':
        return `Ha cargado ${this.totalExpedientes()} documento(s). Debe revisar y finalizar el expediente para cerrar su trámite.`;
      default:
        return 'Su postulación fue registrada, pero aún debe cargar al menos un documento y finalizar el expediente.';
    }
  }

  finalizeHelpText(): string {
    if (this.expedienteFinalizado()) {
      return 'El expediente ya fue finalizado. Solo puede consultarlo.';
    }

    if (this.totalExpedientes() === 0) {
      return 'Debe cargar al menos un documento para habilitar la finalización del expediente.';
    }

    return `Se confirmará el expediente con ${this.totalExpedientes()} documento(s) cargado(s).`;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  fileSizeLabel(sizeInBytes: number | null | undefined): string {
    if (!sizeInBytes || sizeInBytes <= 0) {
      return '—';
    }

    const kb = Math.ceil(sizeInBytes / 1024);
    return `${kb} KB`;
  }

  verificationLabel(item: ExpedienteItem): string {
    return item.verificado ? 'VERIFICADO' : 'PENDIENTE';
  }

  eliminarDocumento(item: ExpedienteItem): void {
    const idPost = this.postId();
    if (!idPost) return;

    this.deleting.set(item.idExpediente);
    this.postulacionService
      .eliminarExpediente(idPost, item.idExpediente)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(null)),
      )
      .subscribe({
        next: () => {
          this.toast.success('Documento eliminado del expediente.');
          this.loadExpediente();
          this.loadPostulacion();
        },
        error: (err: { error?: { message?: string } }) => {
          this.toast.error(err.error?.message || 'No se pudo eliminar el documento.');
        },
      });
  }

  private async prepareSelectedFile(file: File | null): Promise<void> {
    if (!file) {
      this.clearSelectedFile();
      return;
    }

    if (this.expedienteFinalizado()) {
      this.toast.warning('El expediente ya fue finalizado y no admite nuevas cargas.');
      this.clearSelectedFile();
      return;
    }

    if (!this.isValidFile(file)) {
      this.toast.warning('Solo se permiten archivos PDF, PNG, JPG o JPEG.');
      this.clearSelectedFile();
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('El archivo no debe superar 10 MB.');
      this.clearSelectedFile();
      return;
    }

    this.selectedFile.set(file);
    this.selectedFileHash.set(await this.calculateSha256(file));
  }

  private isValidFile(file: File): boolean {
    const allowed = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
    ];

    return allowed.includes(file.type);
  }

  private async calculateSha256(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}