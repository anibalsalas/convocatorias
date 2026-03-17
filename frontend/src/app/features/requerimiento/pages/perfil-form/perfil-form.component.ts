import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiResponse } from '@shared/models/api-response.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ToastService } from '@core/services/toast.service';
import {
  NivelPuestoResponse,
  PerfilConocimientoRequest,
  PerfilExperienciaRequest,
  PerfilFormacionAcademicaRequest,
  PerfilPuestoRequest,
  PerfilPuestoResponse,
  PerfilRegistroContextResponse,
} from '../../models/perfil-puesto.model';
import {
  PerfilConocimientoResponse,
  PerfilExperienciaResponse,
  PerfilFormacionAcademicaResponse,
} from '../../models/perfil-puesto.model';
import { PerfilPuestoService } from '../../services/perfil-puesto.service';
import { forkJoin } from 'rxjs';

interface OptionItem {
  value: number | string;
  label: string;
}

@Component({
  selector: 'app-perfil-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './perfil-form.component.html',
  styleUrls: ['./perfil-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(PerfilPuestoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal(0);
  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly perfilId = signal<number | null>(null);
  readonly registroContext = signal<PerfilRegistroContextResponse | null>(null);
  readonly datosGeneralesGuardado = signal(false);
  readonly editingFormacionIndex = signal<number | null>(null);
  readonly editingConocimientoIndex = signal<number | null>(null);
  readonly editingExperienciaIndex = signal<number | null>(null);

  readonly formacionesGuardadas = signal<PerfilFormacionAcademicaResponse[]>([]);
  readonly conocimientosGuardados = signal<PerfilConocimientoResponse[]>([]);
  readonly experienciasGuardadas = signal<PerfilExperienciaResponse[]>([]);

  readonly datosGeneralesRow = computed(() => {
    if (!this.datosGeneralesGuardado()) return null;
    const raw = this.form.getRawValue();
    return {
      denominacionPuesto: raw.denominacionPuesto,
      nombrePuesto: raw.nombrePuesto,
      unidadOrganica: raw.unidadOrganica,
      idNivelPuesto: raw.idNivelPuesto,
      cantidadPuestos: raw.cantidadPuestos,
    };
  });

  readonly tabs = [
    { id: 'general', title: 'Datos Generales', subtitle: 'Cabecera del perfil CAS' },
    { id: 'formacion', title: 'Formación Académica', subtitle: 'Campo atómico RPE 065-2020' },
    { id: 'conocimientos', title: 'Conocimientos', subtitle: 'Matriz ofimática y dominio' },
    { id: 'experiencia', title: 'Experiencia', subtitle: 'Experiencia general y específica' },
  ];

  /** Ley del Servicio Civil Art. 3 — Categoría (rol funcional del puesto) */
  readonly denominacionOptions: OptionItem[] = [
    { value: 'DIRECTIVO', label: 'Directivo — Jefes, Gerentes, Subgerentes' },
    { value: 'PROFESIONAL', label: 'Profesional — Requiere título o bachiller, tareas de análisis y especialización' },
    { value: 'TÉCNICO', label: 'Técnico — Apoyo administrativo o técnico con formación técnica' },
    { value: 'AUXILIAR', label: 'Auxiliar — Tareas manuales o de soporte básico' },
  ];

  /** Nivel del puesto — cargado desde TBL_NIVEL_PUESTO */
  readonly nivelPuestoOptions = signal<OptionItem[]>([]);

  readonly gradoAcademicoOptions: string[] = [
    'Secundaria completa',
    'Técnico egresado',
    'Técnico titulado',
    'Bachiller',
    'Título profesional',
    'Maestría',
    'Doctorado',
  ];

  readonly conocimientoTipoOptions: string[] = ['OFIMÁTICA', 'IDIOMA', 'TÉCNICO', 'CURSO', 'OTRO'];
  readonly dominioOptions: string[] = ['BÁSICO', 'INTERMEDIO', 'AVANZADO', 'NO_APLICA'];
  readonly experienciaTipoOptions: string[] = ['GENERAL', 'ESPECÍFICA'];
  readonly unidadTiempoOptions: string[] = ['MESES', 'AÑOS'];
  readonly nivelMinimoOptions: string[] = [
    'Auxiliar o asistente',
    'Analista',
    'Especialista',
    'Coordinador / Supervisor',
    'Jefe / Responsable',
  ];

  readonly form = this.fb.group({
    nombrePuesto: ['', [Validators.required, Validators.maxLength(300)]],
    denominacionPuesto: ['', [Validators.required, Validators.maxLength(300)]],
    unidadOrganica: ['', [Validators.required, Validators.maxLength(200)]],
    idNivelPuesto: [null as number | null, [Validators.required]],
    dependenciaJerarquicaLineal: ['', [Validators.maxLength(250)]],
    dependenciaFuncional: ['', [Validators.maxLength(250)]],
    puestosCargo: [0, [Validators.min(0)]],
    cantidadPuestos: [1, [Validators.required, Validators.min(1)]],
    misionPuesto: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  readonly formacionForm = this.fb.group({
    gradoAcademico: ['', [Validators.required, Validators.maxLength(100)]],
    especialidad: ['', [Validators.required, Validators.maxLength(200)]],
    requiereColegiatura: [false],
    requiereHabilitacionProfesional: [false],
  });

  readonly conocimientoForm = this.fb.group({
    tipoConocimiento: ['OFIMÁTICA', [Validators.required, Validators.maxLength(30)]],
    descripcion: ['', [Validators.required, Validators.maxLength(300)]],
    horas: [null as number | null],
    nivelDominio: ['BÁSICO', [Validators.required, Validators.maxLength(30)]],
  });

  readonly experienciaForm = this.fb.group({
    tipoExperiencia: ['GENERAL', [Validators.required, Validators.maxLength(30)]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    unidadTiempo: ['MESES', [Validators.required, Validators.maxLength(10)]],
    nivelMinimoPuesto: ['', [Validators.required, Validators.maxLength(120)]],
    detalle: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.loadContext();
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      const id = Number(idParam);
      this.isEdit.set(true);
      this.perfilId.set(id);
      this.loadPerfil(id);
    }
  }

  nivelPuestoLabel(id: number | null | undefined): string {
    if (id == null) return '—';
    const opt = this.nivelPuestoOptions().find((o) => o.value === id);
    return opt?.label ?? String(id);
  }

  prevTab(): void {
    this.activeTab.update((v) => Math.max(0, v - 1));
  }

  nextTab(): void {
    this.activeTab.update((v) => Math.min(3, v + 1));
  }

  goToTab(index: number): void {
    this.activeTab.set(index);
  }

  isControlInvalid(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  isDatosGeneralesValid(): boolean {
    const c = this.form.controls;
    return c.nombrePuesto.valid && c.denominacionPuesto.valid && c.unidadOrganica.valid
      && c.idNivelPuesto.valid && c.cantidadPuestos.valid && c.misionPuesto.valid;
  }

  guardarDatosGenerales(): void {
    this.form.markAllAsTouched();
    if (!this.isDatosGeneralesValid()) {
      this.toast.warning('Complete los campos obligatorios.');
      return;
    }
    const context = this.registroContext();
    if (!context) {
      this.toast.error('No se pudo resolver el contexto del usuario.');
      return;
    }
    const payload = this.buildDatosGeneralesRequest(context);
    this.saving.set(true);
    const id = this.perfilId();
    const request$ = id
      ? this.svc.actualizar(id, payload)
      : this.svc.crear(payload);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<PerfilPuestoResponse>) => {
        this.saving.set(false);
        this.perfilId.set(res.data.idPerfilPuesto);
        this.datosGeneralesGuardado.set(true);
        this.toast.success(id ? 'Datos generales actualizados.' : 'Datos generales guardados.');
        if (!id) {
          this.router.navigate(['/sistema/requerimiento/perfil', res.data.idPerfilPuesto], { replaceUrl: true });
        }
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'No se pudo guardar.';
        this.toast.error(msg);
      },
    });
  }

  editarDatosGenerales(): void {
    this.datosGeneralesGuardado.set(false);
  }

  eliminarDatosGenerales(): void {
    const id = this.perfilId();
    if (!id) return;
    if (!confirm('¿Eliminar el perfil de puesto? Esta acción no se puede deshacer.')) return;
    this.saving.set(true);
    this.svc.eliminar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.perfilId.set(null);
        this.datosGeneralesGuardado.set(false);
        this.formacionesGuardadas.set([]);
        this.conocimientosGuardados.set([]);
        this.experienciasGuardadas.set([]);
        this.toast.success('Perfil eliminado.');
        this.router.navigate(['/sistema/requerimiento/perfiles']);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'No se pudo eliminar.');
      },
    });
  }

  guardarFormacion(): void {
    this.formacionForm.markAllAsTouched();
    if (!this.formacionForm.valid) return;
    const id = this.perfilId();
    if (!id) return;
    const raw = this.formacionForm.getRawValue();
    const item: PerfilFormacionAcademicaRequest = {
      gradoAcademico: String(raw.gradoAcademico ?? '').trim(),
      especialidad: String(raw.especialidad ?? '').trim(),
      requiereColegiatura: Boolean(raw.requiereColegiatura),
      requiereHabilitacionProfesional: Boolean(raw.requiereHabilitacionProfesional),
      orden: 0,
    };
    const idx = this.editingFormacionIndex();
    let list = [...this.formacionesGuardadas()];
    if (idx !== null) {
      list = list.map((f, i) => (i === idx ? { ...f, ...item } : f));
      this.editingFormacionIndex.set(null);
    } else {
      list = [...list, { ...item, idPerfilFormacion: -(list.length + 1) } as PerfilFormacionAcademicaResponse];
    }
    this.formacionesGuardadas.set(list);
    this.formacionForm.reset({ gradoAcademico: '', especialidad: '', requiereColegiatura: false, requiereHabilitacionProfesional: false });
    this.persistFormacionesConocimientosExperiencias();
  }

  editarFormacion(index: number): void {
    const f = this.formacionesGuardadas()[index];
    this.formacionForm.patchValue({
      gradoAcademico: f.gradoAcademico,
      especialidad: f.especialidad,
      requiereColegiatura: f.requiereColegiatura,
      requiereHabilitacionProfesional: f.requiereHabilitacionProfesional,
    });
    this.editingFormacionIndex.set(index);
  }

  cancelarEdicionFormacion(): void {
    this.editingFormacionIndex.set(null);
    this.formacionForm.reset({ gradoAcademico: '', especialidad: '', requiereColegiatura: false, requiereHabilitacionProfesional: false });
  }

  eliminarFormacion(index: number): void {
    const list = this.formacionesGuardadas().filter((_, i) => i !== index);
    this.formacionesGuardadas.set(list);
    this.editingFormacionIndex.set(null);
    this.persistFormacionesConocimientosExperiencias();
  }

  guardarConocimiento(): void {
    this.conocimientoForm.markAllAsTouched();
    if (!this.conocimientoForm.valid) return;
    const id = this.perfilId();
    if (!id) return;
    const raw = this.conocimientoForm.getRawValue();
    const item: PerfilConocimientoRequest = {
      tipoConocimiento: String(raw.tipoConocimiento ?? '').trim().toUpperCase(),
      descripcion: String(raw.descripcion ?? '').trim(),
      horas: raw.horas ?? null,
      nivelDominio: String(raw.nivelDominio ?? 'NO_APLICA').trim().toUpperCase(),
      orden: 0,
    };
    const idx = this.editingConocimientoIndex();
    let list = [...this.conocimientosGuardados()];
    if (idx !== null) {
      list = list.map((c, i) => (i === idx ? { ...c, ...item } : c));
      this.editingConocimientoIndex.set(null);
    } else {
      list = [...list, { ...item, idPerfilConocimiento: -(list.length + 1) } as PerfilConocimientoResponse];
    }
    this.conocimientosGuardados.set(list);
    this.conocimientoForm.reset({ tipoConocimiento: 'OFIMÁTICA', descripcion: '', horas: null, nivelDominio: 'BÁSICO' });
    this.applyConocimientoFormRules();
    this.persistFormacionesConocimientosExperiencias();
  }

  onConocimientoTypeChange(): void {
    this.applyConocimientoFormRules();
  }

  editarConocimiento(index: number): void {
    const c = this.conocimientosGuardados()[index];
    this.conocimientoForm.patchValue({
      tipoConocimiento: c.tipoConocimiento,
      descripcion: c.descripcion,
      horas: c.horas ?? null,
      nivelDominio: c.nivelDominio,
    });
    this.editingConocimientoIndex.set(index);
  }

  cancelarEdicionConocimiento(): void {
    this.editingConocimientoIndex.set(null);
    this.conocimientoForm.reset({ tipoConocimiento: 'OFIMÁTICA', descripcion: '', horas: null, nivelDominio: 'BÁSICO' });
    this.applyConocimientoFormRules();
  }

  eliminarConocimiento(index: number): void {
    const list = this.conocimientosGuardados().filter((_, i) => i !== index);
    this.conocimientosGuardados.set(list);
    this.editingConocimientoIndex.set(null);
    this.persistFormacionesConocimientosExperiencias();
  }

  guardarExperiencia(): void {
    this.experienciaForm.markAllAsTouched();
    if (!this.experienciaForm.valid) return;
    const id = this.perfilId();
    if (!id) return;
    const raw = this.experienciaForm.getRawValue();
    const item: PerfilExperienciaRequest = {
      tipoExperiencia: String(raw.tipoExperiencia ?? '').trim().toUpperCase(),
      cantidad: Number(raw.cantidad ?? 1),
      unidadTiempo: String(raw.unidadTiempo ?? 'MESES').trim().toUpperCase(),
      nivelMinimoPuesto: String(raw.nivelMinimoPuesto ?? '').trim(),
      detalle: String(raw.detalle ?? '').trim(),
      orden: 0,
    };
    const idx = this.editingExperienciaIndex();
    let list = [...this.experienciasGuardadas()];
    if (idx !== null) {
      list = list.map((e, i) => (i === idx ? { ...e, ...item } : e));
      this.editingExperienciaIndex.set(null);
    } else {
      list = [...list, { ...item, idPerfilExperiencia: -(list.length + 1) } as PerfilExperienciaResponse];
    }
    this.experienciasGuardadas.set(list);
    this.experienciaForm.reset({
      tipoExperiencia: 'GENERAL',
      cantidad: 1,
      unidadTiempo: 'MESES',
      nivelMinimoPuesto: '',
      detalle: '',
    });
    this.persistFormacionesConocimientosExperiencias();
  }

  editarExperiencia(index: number): void {
    const e = this.experienciasGuardadas()[index];
    this.experienciaForm.patchValue({
      tipoExperiencia: e.tipoExperiencia,
      cantidad: e.cantidad,
      unidadTiempo: e.unidadTiempo,
      nivelMinimoPuesto: e.nivelMinimoPuesto,
      detalle: e.detalle,
    });
    this.editingExperienciaIndex.set(index);
  }

  cancelarEdicionExperiencia(): void {
    this.editingExperienciaIndex.set(null);
    this.experienciaForm.reset({
      tipoExperiencia: 'GENERAL',
      cantidad: 1,
      unidadTiempo: 'MESES',
      nivelMinimoPuesto: '',
      detalle: '',
    });
  }

  eliminarExperiencia(index: number): void {
    const list = this.experienciasGuardadas().filter((_, i) => i !== index);
    this.experienciasGuardadas.set(list);
    this.editingExperienciaIndex.set(null);
    this.persistFormacionesConocimientosExperiencias();
  }

  finalizar(): void {
    this.router.navigate(['/sistema/requerimiento/perfiles']);
  }

  private persistFormacionesConocimientosExperiencias(): void {
    const id = this.perfilId();
    const context = this.registroContext();
    if (!id) {
      this.toast.error('Guarde primero los Datos Generales.');
      return;
    }
    if (!context) {
      this.toast.error('No se pudo resolver el contexto. Recargue la página.');
      return;
    }
    const payload = this.buildFullRequest(context);
    this.saving.set(true);
    this.svc.actualizar(id, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<PerfilPuestoResponse>) => {
        this.formacionesGuardadas.set(res.data.formacionesAcademicas ?? []);
        this.conocimientosGuardados.set(res.data.conocimientos ?? []);
        this.experienciasGuardadas.set(res.data.experiencias ?? []);
        this.saving.set(false);
        this.toast.success('Registro guardado.');
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'No se pudo guardar. Verifique la consola.';
        this.toast.error(msg);
      },
    });
  }

  private buildDatosGeneralesRequest(context: PerfilRegistroContextResponse): PerfilPuestoRequest {
    const raw = this.form.getRawValue();
    return {
      nombrePuesto: String(raw.nombrePuesto ?? '').trim(),
      denominacionPuesto: String(raw.denominacionPuesto ?? '').trim().toUpperCase(),
      unidadOrganica: context.unidadOrganica,
      idAreaSolicitante: context.idAreaSolicitante,
      idNivelPuesto: raw.idNivelPuesto ?? undefined,
      dependenciaJerarquicaLineal: String(raw.dependenciaJerarquicaLineal ?? '').trim() || undefined,
      dependenciaFuncional: String(raw.dependenciaFuncional ?? '').trim() || undefined,
      puestosCargo: raw.puestosCargo ?? 0,
      misionPuesto: String(raw.misionPuesto ?? '').trim(),
      cantidadPuestos: Number(raw.cantidadPuestos ?? 1),
      formacionesAcademicas: [],
      conocimientos: [],
      experiencias: [],
    };
  }

  private buildFullRequest(context: PerfilRegistroContextResponse): PerfilPuestoRequest {
    const raw = this.form.getRawValue();
    const formaciones: PerfilFormacionAcademicaRequest[] = this.formacionesGuardadas().map((f, i) => ({
      gradoAcademico: f.gradoAcademico,
      especialidad: f.especialidad,
      requiereColegiatura: f.requiereColegiatura,
      requiereHabilitacionProfesional: f.requiereHabilitacionProfesional,
      orden: i + 1,
    }));
    const conocimientos: PerfilConocimientoRequest[] = this.conocimientosGuardados().map((c, i) => ({
      tipoConocimiento: c.tipoConocimiento,
      descripcion: c.descripcion,
      horas: c.horas ?? null,
      nivelDominio: c.nivelDominio,
      orden: i + 1,
    }));
    const experiencias: PerfilExperienciaRequest[] = this.experienciasGuardadas().map((e, i) => ({
      tipoExperiencia: e.tipoExperiencia,
      cantidad: e.cantidad,
      unidadTiempo: e.unidadTiempo,
      nivelMinimoPuesto: e.nivelMinimoPuesto,
      detalle: e.detalle,
      orden: i + 1,
    }));
    return {
      nombrePuesto: String(raw.nombrePuesto ?? '').trim(),
      denominacionPuesto: String(raw.denominacionPuesto ?? '').trim().toUpperCase(),
      unidadOrganica: context.unidadOrganica,
      idAreaSolicitante: context.idAreaSolicitante,
      idNivelPuesto: raw.idNivelPuesto ?? undefined,
      dependenciaJerarquicaLineal: String(raw.dependenciaJerarquicaLineal ?? '').trim() || undefined,
      dependenciaFuncional: String(raw.dependenciaFuncional ?? '').trim() || undefined,
      puestosCargo: raw.puestosCargo ?? 0,
      misionPuesto: String(raw.misionPuesto ?? '').trim(),
      cantidadPuestos: Number(raw.cantidadPuestos ?? 1),
      formacionesAcademicas: formaciones,
      conocimientos,
      experiencias,
    };
  }

  private applyConocimientoFormRules(): void {
    const g = this.conocimientoForm;
    const type = String(g.controls.tipoConocimiento.value ?? '').toUpperCase();
    const domainApplies = type === 'OFIMÁTICA' || type === 'IDIOMA';
    const levelControl = g.controls.nivelDominio;
    const hoursControl = g.controls.horas;
    if (domainApplies) {
      if (!levelControl.value || levelControl.value === 'NO_APLICA') levelControl.setValue('BÁSICO');
      levelControl.enable({ emitEvent: false });
      levelControl.setValidators([Validators.required, Validators.maxLength(30)]);
    } else {
      levelControl.setValue('NO_APLICA', { emitEvent: false });
      levelControl.disable({ emitEvent: false });
      levelControl.clearValidators();
    }
    if (domainApplies || type === 'TÉCNICO') {
      hoursControl.clearValidators();
    } else {
      hoursControl.setValidators([Validators.required, Validators.min(1)]);
    }
    hoursControl.updateValueAndValidity({ emitEvent: false });
    levelControl.updateValueAndValidity({ emitEvent: false });
  }

  private loadContext(): void {
    this.loading.set(true);
    forkJoin({
      context: this.svc.obtenerContextoRegistro(),
      niveles: this.svc.listarNivelesPuesto(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ context, niveles }) => {
        this.registroContext.set(context.data);
        this.form.controls.unidadOrganica.setValue(context.data.unidadOrganica);
        this.nivelPuestoOptions.set(
          (niveles.data ?? []).map((n: NivelPuestoResponse) => ({
            value: n.idNivelPuesto,
            label: `${n.codigo} — ${n.descripcion}`,
          }))
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo obtener la unidad orgánica.');
      },
    });
  }

  private loadPerfil(id: number): void {
    this.loading.set(true);
    this.svc.obtener(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: ApiResponse<PerfilPuestoResponse>) => {
        const data = response.data;
        this.form.patchValue({
          nombrePuesto: data.nombrePuesto ?? '',
          denominacionPuesto: data.denominacionPuesto,
          unidadOrganica: data.unidadOrganica,
          idNivelPuesto: data.idNivelPuesto ?? null,
          dependenciaJerarquicaLineal: data.dependenciaJerarquicaLineal ?? '',
          dependenciaFuncional: data.dependenciaFuncional ?? '',
          puestosCargo: data.puestosCargo ?? 0,
          cantidadPuestos: data.cantidadPuestos,
          misionPuesto: data.misionPuesto,
        });
        this.datosGeneralesGuardado.set(true);
        this.formacionesGuardadas.set(data.formacionesAcademicas ?? []);
        this.conocimientosGuardados.set(data.conocimientos ?? []);
        this.experienciasGuardadas.set(data.experiencias ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar el perfil.');
      },
    });
  }
}
