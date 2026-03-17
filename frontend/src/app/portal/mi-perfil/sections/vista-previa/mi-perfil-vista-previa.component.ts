import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    computed,
    inject,
    signal,
    viewChild,
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { HttpErrorResponse } from '@angular/common/http';
  import { forkJoin, map } from 'rxjs';
  import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
  
  import { ToastService } from '@core/services/toast.service';
  import { UbigeoService } from '@core/services/ubigeo.service';
  import { PostulantePerfilService } from '@core/services/postulante-perfil.service';
  import { PostulanteFormacionAcademicaService } from '@core/services/postulante-formacion-academica.service';
  import { PostulanteConocimientoService } from '@core/services/postulante-conocimiento.service';
  import { PostulanteExperienciaService } from '@core/services/postulante-experiencia.service';
  import { PostulanteDocumentoService } from '@core/services/postulante-documento.service';
  
  import { ApiResponse } from '@shared/models/api-response.model';
  import { PostulantePerfil } from '@shared/models/postulante-perfil.model';
  import { PostulanteFormacionAcademica } from '@shared/models/postulante-formacion-academica.model';
  import { PostulanteConocimiento } from '@shared/models/postulante-conocimiento.model';
  import { PostulanteExperiencia } from '@shared/models/postulante-experiencia.model';
  import { PostulanteDocumento } from '@shared/models/postulante-documento.model';
  import { UbigeoDepartamento } from '@shared/models/ubigeo.model';
  
  type OfimaticaLevel = 'NO_APLICA' | 'BÁSICO' | 'INTERMEDIO' | 'AVANZADO';
  
  interface OfimaticaRow {
    nombre: string;
    nivel: OfimaticaLevel;
  }
  
  interface IdiomaRow {
    idioma: string;
    nivel: string;
  }
  
  @Component({
    selector: 'app-mi-perfil-vista-previa',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './mi-perfil-vista-previa.component.html',
    styleUrls: ['./mi-perfil-vista-previa.component.css'],
  })
  export class MiPerfilVistaPreviaComponent {
    private readonly destroyRef = inject(DestroyRef);
    private readonly toast = inject(ToastService);
    private readonly ubigeoService = inject(UbigeoService);
    private readonly perfilService = inject(PostulantePerfilService);
    private readonly formacionService = inject(PostulanteFormacionAcademicaService);
    private readonly conocimientoService = inject(PostulanteConocimientoService);
    private readonly experienciaService = inject(PostulanteExperienciaService);
    private readonly documentoService = inject(PostulanteDocumentoService);
  
    readonly previewContent = viewChild<ElementRef<HTMLElement>>('previewContent');
  
    readonly loading = signal(true);
    readonly errorMsg = signal('');
  
    readonly perfil = signal<PostulantePerfil | null>(null);
    readonly formaciones = signal<PostulanteFormacionAcademica[]>([]);
    readonly conocimientos = signal<PostulanteConocimiento[]>([]);
    readonly experiencias = signal<PostulanteExperiencia[]>([]);
    readonly documentos = signal<PostulanteDocumento[]>([]);
    readonly ubigeos = signal<UbigeoDepartamento[]>([]);
  
    readonly logoUrl = `${window.location.origin}/assets/images/logo.png`;
  
    readonly fullName = computed(() => {
      const perfil = this.perfil();
      if (!perfil) {
        return '—';
      }
  
      return [
        perfil.apellidoPaterno ?? '',
        perfil.apellidoMaterno ?? '',
        perfil.nombres ?? '',
      ]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase() || '—';
    });
  
    readonly domicilioLabel = computed(() => {
      const perfil = this.perfil();
      if (!perfil?.ubigeo) {
        return '—';
      }
  
      return this.resolveUbigeoPath(perfil.ubigeo);
    });
  
    readonly documentNumberLabel = computed(() => {
      const perfil = this.perfil();
      if (!perfil) {
        return '—';
      }
  
      const tipo = this.upper(perfil.tipoDocumento) || 'DNI';
      const numero = this.upper(perfil.numeroDocumento);
      return numero ? `${tipo} - ${numero}` : tipo;
    });
  
    readonly breveteLabel = computed(() => {
      const perfil = this.perfil();
      if (!perfil) {
        return 'N/A - CATEGORÍA: NA';
      }
  
      const numero = this.upper(perfil.nroBrevete) || 'N/A';
      const categoria = this.upper(perfil.categoriaBrevete) || 'NA';
      return `${numero} - CATEGORÍA: ${categoria}`;
    });
  
    readonly cursosEspecializacion = computed(() =>
      this.conocimientos().filter((item) =>
        ['CERTIFICACIÓN', 'DIPLOMADO', 'ESPECIALIZACIÓN', 'CURSO', 'PROGRAMA'].includes(
          this.upper(item.tipoConocimiento),
        ),
      ),
    );
  
    readonly ofimaticaRows = computed<OfimaticaRow[]>(() =>
      this.conocimientos()
        .filter((item) => this.upper(item.tipoConocimiento) === 'OFIMATICA')
        .map((item) => ({
          nombre: this.upper(item.tipoOfimatica ?? item.descripcion) || '—',
          nivel: this.normalizeOfimaticaLevel(item.nivel),
        })),
    );
  
    readonly idiomasRows = computed<IdiomaRow[]>(() =>
      this.conocimientos()
        .filter((item) => this.upper(item.tipoConocimiento) === 'IDIOMA')
        .map((item) => ({
          idioma: this.upper(item.descripcion) || '—',
          nivel: this.upper(item.nivel) || '—',
        })),
    );
  
    readonly generalExperiences = computed(() =>
      this.experiencias().filter((item) => this.upper(item.tipoExperiencia) === 'GENERAL'),
    );
  
    readonly specificExperiences = computed(() =>
      this.experiencias().filter((item) => this.upper(item.tipoExperiencia) === 'ESPECIFICA'),
    );
  
    readonly specificPublicExperiences = computed(() =>
      this.specificExperiences().filter((item) => this.upper(item.tipoSector) === 'PUBLICO'),
    );
  
    constructor() {
      this.loadPreview();
    }
  
    onActualizarVista(): void {
      this.loadPreview();
    }
  
    onDescargarPdf(): void {
      const content = this.previewContent()?.nativeElement;

      if (!content) {
        this.toast.error('No se pudo preparar la vista previa para impresión.');
        return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        this.toast.error('No se pudo preparar la vista previa para impresión.');
        return;
      }

      doc.open();
      doc.write(`
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Vista previa postulante</title>
            <style>${this.buildPrintStyles()}</style>
          </head>
          <body>
            ${content.outerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  
    formatDate(value: string | null | undefined): string {
      if (!value) {
        return '—';
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
  
    hoursLabel(value: number | null | undefined): string {
      if (value === null || value === undefined) {
        return '—';
      }
  
      return `${value} horas`;
    }
  
    boolMark(value: boolean | null | undefined, expected: boolean): string {
      return value === expected ? 'X' : '';
    }
  
    yesNoLabel(value: boolean | null | undefined): string {
      return value ? 'SI' : 'NO';
    }
  
    getExperiencePeriodLabel(fechaInicio: string | null | undefined, fechaFin: string | null | undefined): string {
      const period = this.calculateInclusivePeriod(fechaInicio, fechaFin);
      return `${period.years} año(s) - ${period.months} mes(es) - ${period.days} día(s)`;
    }
  
    getExperienceTotalLabel(items: PostulanteExperiencia[]): string {
      const totalDays = items.reduce(
        (acc, item) =>
          acc + this.calculateInclusivePeriod(item.fechaInicio, item.fechaFin).totalDays,
        0,
      );
  
      const period = this.breakdownFromTotalDays(totalDays);
      return `${period.years} año(s) - ${period.months} mes(es) - ${period.days} día(s)`;
    }
  
    trackByDocumento(_: number, item: PostulanteDocumento): number {
      return item.idDocumento;
    }
  
    trackByFormacion(_: number, item: PostulanteFormacionAcademica): number {
      return item.idFormacionAcademica;
    }
  
    trackByConocimiento(_: number, item: PostulanteConocimiento): number {
      return item.idConocimiento;
    }
  
    trackByExperiencia(_: number, item: PostulanteExperiencia): number {
      return item.idExperiencia;
    }
  
    private loadPreview(): void {
      this.loading.set(true);
      this.errorMsg.set('');
  
      forkJoin({
        perfil: this.perfilService.getMiPerfil().pipe(
          map((res) => this.extractRequiredObject(res, 'No se pudo cargar los datos personales.')),
        ),
        formaciones: this.formacionService.listar().pipe(
          map((res) => this.extractArray(res, 'No se pudo cargar formación académica.')),
        ),
        conocimientos: this.conocimientoService.listar().pipe(
          map((res) => this.extractArray(res, 'No se pudo cargar conocimientos.')),
        ),
        experiencias: this.experienciaService.listar().pipe(
          map((res) => this.extractArray(res, 'No se pudo cargar experiencia.')),
        ),
        documentos: this.documentoService.listar().pipe(
          map((res) => this.extractArray(res, 'No se pudo cargar documentos.')),
        ),
        ubigeos: this.ubigeoService.getUbigeos(),
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            this.perfil.set(data.perfil);
            this.formaciones.set(data.formaciones);
            this.conocimientos.set(data.conocimientos);
            this.experiencias.set(data.experiencias);
            this.documentos.set(data.documentos);
            this.ubigeos.set(data.ubigeos);
            this.loading.set(false);
          },
          error: (error: Error | HttpErrorResponse) => {
            this.loading.set(false);
            const message =
              error instanceof HttpErrorResponse
                ? this.extractApiError(error, 'No se pudo cargar la vista previa.')
                : error.message || 'No se pudo cargar la vista previa.';
  
            this.errorMsg.set(message);
            this.toast.error(message);
          },
        });
    }
  
    private extractRequiredObject<T>(
      response: ApiResponse<T>,
      fallback: string,
    ): T {
      if (response.success && response.data) {
        return response.data;
      }
  
      throw new Error(response.error ?? response.message ?? fallback);
    }
  
    private extractArray<T>(
      response: ApiResponse<T[]>,
      fallback: string,
    ): T[] {
      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }
  
      if (response.success && !response.data) {
        return [];
      }
  
      throw new Error(response.error ?? response.message ?? fallback);
    }
  
    private resolveUbigeoPath(ubigeo: string): string {
      const codigoDepartamento = ubigeo.slice(0, 2);
      const codigoProvincia = ubigeo.slice(2, 4);
      const codigoDistrito = ubigeo.slice(4, 6);
  
      const departamento = this.ubigeos().find((item) => item.codigo === codigoDepartamento);
      const provincia = departamento?.provincias.find((item) => item.codigo === codigoProvincia);
      const distrito = provincia?.distritos.find((item) => item.codigo === codigoDistrito);
  
      const parts = [
        this.upper(departamento?.nombre),
        this.upper(provincia?.nombre),
        this.upper(distrito?.nombre),
      ].filter((value) => !!value);
  
      return parts.length > 0 ? parts.join(' / ') : ubigeo;
    }
  
    private normalizeOfimaticaLevel(value: string | null | undefined): OfimaticaLevel {
      const normalized = this.upper(value);
  
      if (normalized === 'BÁSICO' || normalized === 'BASICO') {
        return 'BÁSICO';
      }
  
      if (normalized === 'INTERMEDIO') {
        return 'INTERMEDIO';
      }
  
      if (normalized === 'AVANZADO') {
        return 'AVANZADO';
      }
  
      return 'NO_APLICA';
    }
  
    private upper(value: string | null | undefined): string {
      return value?.trim().toUpperCase() ?? '';
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
  
    private calculateInclusivePeriod(
      fechaInicio: string | null | undefined,
      fechaFin: string | null | undefined,
    ): {
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
  
    private buildPrintStyles(): string {
      return `
        @page {
          size: A4;
          margin: 14mm;
        }
  
        body {
          margin: 0;
          background: #ffffff;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
        }
  
        .preview-document {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
          background: #ffffff;
          color: #111827;
        }
  
        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }
  
        .preview-logo {
          height: 52px;
          width: 52px;
          object-fit: contain;
        }
  
        .preview-title-block {
          flex: 1;
          text-align: center;
        }
  
        .preview-main-title {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
  
        .preview-subtitle {
          margin-top: 4px;
          font-size: 11px;
        }
  
        .preview-note {
          margin: 12px 0 18px;
          font-size: 11px;
        }
  
        .section-title {
          margin: 16px 0 8px;
          font-size: 15px;
          font-weight: 700;
          text-transform: uppercase;
        }
  
        .preview-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10.5px;
          margin-bottom: 14px;
        }
  
        .preview-table th,
        .preview-table td {
          border: 1px solid #000000;
          padding: 5px 6px;
          vertical-align: top;
          word-wrap: break-word;
        }
  
        .preview-table thead th {
          background: #a9c5ea;
          text-align: center;
          font-weight: 700;
        }
  
        .preview-table td.pre-line {
          white-space: pre-line;
        }
  
        .preview-table .text-center {
          text-align: center;
        }
  
        .preview-table .text-right {
          text-align: right;
        }
  
        .preview-table .summary-row {
          background: #dcefdc;
          font-weight: 700;
        }
  
        .muted {
          color: #374151;
        }
  
        .inline-pair {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
  
        .compact-table th,
        .compact-table td {
          padding: 4px 6px;
        }
  
        .preview-block {
          page-break-inside: avoid;
        }
      `;
    }
  }