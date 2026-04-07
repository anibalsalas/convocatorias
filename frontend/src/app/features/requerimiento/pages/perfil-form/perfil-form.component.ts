import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiResponse } from '@shared/models/api-response.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ToastService } from '@core/services/toast.service';
import {
  CondicionPuestoRequest,
  DenominacionPuestoResponse,
  FuncionPuestoRequest,
  NivelPuestoResponse,
  PerfilConocimientoRequest,
  PerfilExperienciaRequest,
  PerfilFormacionAcademicaRequest,
  PerfilPuestoRequest,
  PerfilPuestoResponse,
  PerfilRegistroContextResponse,
} from '../../models/perfil-puesto.model';
import {
  FuncionPuestoResponse,
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

  /** Fecha mínima para el date picker de término de contrato (hoy) */
  readonly minFechaTermino = new Date().toISOString().slice(0, 10);

  readonly activeTab = signal(0);
  readonly isEdit = signal(false);
  /** Modo solo lectura — activado desde ruta /ver para ORH */
  readonly modoSoloLectura = signal(false);
  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly perfilId = signal<number | null>(null);
  readonly registroContext = signal<PerfilRegistroContextResponse | null>(null);
  readonly datosGeneralesGuardado = signal(false);
  readonly estadoRequerimientoAsociado = signal<string | null>(null);
  /** Readonly cuando el requerimiento ya superó el estado ELABORADO (OPP aprobó presupuesto) */
  readonly condicionesReadonly = computed(() => {
    const estado = this.estadoRequerimientoAsociado();
    return estado !== null && estado !== 'ELABORADO';
  });
  readonly condicionGuardada = signal(false);
  readonly mensajeFinalizado = signal<string | null>(null);
  readonly editingFormacionIndex = signal<number | null>(null);
  readonly editingConocimientoIndex = signal<number | null>(null);
  readonly editingExperienciaIndex = signal<number | null>(null);
  readonly editingCompetenciaIndex = signal<number | null>(null);
  readonly editingCursoIndex = signal<number | null>(null);
  readonly editingFuncionIndex = signal<number | null>(null);

  readonly formacionesGuardadas = signal<PerfilFormacionAcademicaResponse[]>([]);
  readonly conocimientosGuardados = signal<PerfilConocimientoResponse[]>([]);
  readonly experienciasGuardadas = signal<PerfilExperienciaResponse[]>([]);
  readonly competenciasGuardadas = signal<PerfilConocimientoResponse[]>([]);
  readonly cursosGuardados = signal<PerfilConocimientoResponse[]>([]);
  readonly funcionesGuardadas = signal<FuncionPuestoResponse[]>([]);

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
    { id: 'experiencia', title: 'Experiencia', subtitle: 'Experiencia general y específica' },
    { id: 'competencias', title: 'Competencias', subtitle: 'Habilidades y aptitudes requeridas' },
    { id: 'formacion', title: 'Formación Académica', subtitle: 'Campo atómico RPE 065-2020' },
    { id: 'cursos', title: 'Cursos / Especialización', subtitle: 'Cursos y estudios de especialización' },
    { id: 'conocimientos', title: 'Conocimientos', subtitle: 'Conocimientos para el puesto o cargo' },
    { id: 'caracteristicas', title: 'Características del Puesto', subtitle: 'Sección III Bases — principales actividades' },
    { id: 'condicion', title: 'Condiciones', subtitle: 'Sección IV Bases — remuneración, lugar y horario' },
  ];

  /** Ley del Servicio Civil Art. 3 — Categoría (rol funcional del puesto) — cargado desde TBL_DENOMINACION_PUESTO */
  readonly denominacionOptions = signal<OptionItem[]>([]);

  /** Nivel del puesto — cargado desde TBL_NIVEL_PUESTO */
  readonly nivelPuestoOptions = signal<OptionItem[]>([]);

  readonly conocimientoTipoOptions: string[] = ['OFIMÁTICA', 'IDIOMA', 'OTRO'];
  readonly dominioOptions: string[] = ['BÁSICO', 'INTERMEDIO', 'AVANZADO', 'NO_APLICA'];
  readonly experienciaTipoOptions: string[] = ['GENERAL', 'ESPECÍFICA'];
  readonly unidadTiempoOptions: string[] = ['MESES', 'AÑOS'];
  readonly nivelMinimoOptions: string[] = [
    'Auxiliar / Asistente /Tecnico',
    'Analista',
    'Especialista',
    'Coordinador / Supervisor',
    'Jefe / Responsable',
  ];

  private static readonly HHMM_OPT = /^$|^([01]\d|2[0-3]):[0-5]\d$/;

  /** Meses en español para formateo de fecha al PDF */
  private static readonly MESES_ES: Record<number, string> = {
    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril', 5: 'mayo', 6: 'junio',
    7: 'julio', 8: 'agosto', 9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre',
  };

  /** Valida que la fecha no sea anterior a hoy */
  private static fechaMinHoyValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) return null; // required se encarga
    const hoy = new Date().toISOString().slice(0, 10);
    return val < hoy ? { fechaMinima: true } : null;
  };

  /** Días + hora inicio + hora fin: los tres o ninguno (coherente con Bases PDF). */
  private static condicionHorarioGrupoValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const g = group as FormGroup;
    const d = String(g.get('diasLaborales')?.value ?? '').trim();
    const i = String(g.get('horarioInicio')?.value ?? '').trim();
    const f = String(g.get('horarioFin')?.value ?? '').trim();
    const any = !!(d || i || f);
    const all = !!(d && i && f);
    return any && !all ? { horarioCondicionIncompleto: true } : null;
  };

  readonly form = this.fb.group({
    nombrePuesto: ['', [Validators.required, Validators.maxLength(300)]],
    denominacionPuesto: ['', [Validators.required, Validators.maxLength(300)]],
    unidadOrganica: ['', [Validators.required, Validators.maxLength(200)]],
    idNivelPuesto: [null as number | null, [Validators.required]],
    cantidadPuestos: [1, [Validators.required, Validators.min(1)]],
    misionPuesto: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  readonly formacionForm = this.fb.group({
    gradoAcademico: ['', [Validators.required, Validators.maxLength(500)]],
    requiereColegiatura: [false],
    requiereHabilitacionProfesional: [false],
  });

  readonly conocimientoForm = this.fb.group({
    tipoConocimiento: ['OFIMÁTICA', [Validators.required, Validators.maxLength(30)]],
    descripcion: ['', [Validators.required, Validators.maxLength(300)]],
    horas: [null as number | null],
    nivelDominio: ['BÁSICO', [Validators.required, Validators.maxLength(30)]],
  });

  readonly competenciaForm = this.fb.group({
    descripcion: ['', [Validators.required, Validators.maxLength(300)]],
  });

  readonly cursoForm = this.fb.group({
    descripcion: ['', [Validators.required, Validators.maxLength(300)]],
    horas: [null as number | null, [Validators.required, Validators.min(0), Validators.max(999)]],
  });

  readonly experienciaForm = this.fb.group({
    tipoExperiencia: ['GENERAL', [Validators.required, Validators.maxLength(30)]],
    cantidad: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    unidadTiempo: ['MESES', [Validators.required, Validators.maxLength(10)]],
    nivelMinimoPuesto: ['', [Validators.maxLength(120)]],
    detalle: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  readonly funcionForm = this.fb.group({
    descripcionFuncion: ['', [Validators.required, Validators.maxLength(500)]],
  });

  readonly condicionForm = this.fb.group(
    {
      remuneracionMensual: [null as number | null, [Validators.required, Validators.min(0.01)]],
      duracionContrato: ['', [Validators.required, PerfilFormComponent.fechaMinHoyValidator]],
      lugarPrestacion: ['Agencia de Compras de las Fuerzas Armadas en la Av. Arequipa 310 - Cercado – Lima', [Validators.required, Validators.maxLength(300)]],
      jornadaSemanal: [48, [Validators.required, Validators.min(1), Validators.max(48)]],
      diasLaborales: ['Lunes a viernes', [Validators.maxLength(100)]],
      horarioInicio: ['08:30', [Validators.pattern(PerfilFormComponent.HHMM_OPT)]],
      horarioFin: ['17:00', [Validators.pattern(PerfilFormComponent.HHMM_OPT)]],
      modalidadServicio: [''],
      tipoInicioContrato: [''],
      otrasCondiciones: ['', [Validators.maxLength(1000)]],
    },
    { validators: [PerfilFormComponent.condicionHorarioGrupoValidator] },
  );

  ngOnInit(): void {
    if (this.route.snapshot.data['soloLectura']) {
      this.modoSoloLectura.set(true);
    }
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

  /** Letra a., b., … para preview alineado al PDF de bases */
  letraActividad(index: number): string {
    return `${String.fromCharCode('a'.charCodeAt(0) + index)}.`;
  }

  prevTab(): void {
    this.activeTab.update((v) => Math.max(0, v - 1));
  }

  nextTab(): void {
    this.activeTab.update((v) => Math.min(this.tabs.length - 1, v + 1));
  }

  goToTab(index: number): void {
    this.activeTab.set(index);
  }

  isControlInvalid(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  condicionHorarioGrupoInvalid(): boolean {
    const err = this.condicionForm.errors?.['horarioCondicionIncompleto'];
    return !!err && (this.condicionForm.touched || this.condicionForm.dirty);
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
        this.competenciasGuardadas.set([]);
        this.cursosGuardados.set([]);
        this.experienciasGuardadas.set([]);
        this.funcionesGuardadas.set([]);
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
    this.formacionForm.reset({ gradoAcademico: '', requiereColegiatura: false, requiereHabilitacionProfesional: false });
    this.persistFormacionesConocimientosExperiencias();
  }

  editarFormacion(index: number): void {
    const f = this.formacionesGuardadas()[index];
    this.formacionForm.patchValue({
      gradoAcademico: f.gradoAcademico,
      requiereColegiatura: f.requiereColegiatura,
      requiereHabilitacionProfesional: f.requiereHabilitacionProfesional,
    });
    this.editingFormacionIndex.set(index);
  }

  cancelarEdicionFormacion(): void {
    this.editingFormacionIndex.set(null);
    this.formacionForm.reset({ gradoAcademico: '', requiereColegiatura: false, requiereHabilitacionProfesional: false });
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

  filtrarHoras(event: Event): void {
    const input = event.target as HTMLInputElement;
    const soloDigitos = input.value.replace(/[^0-9]/g, '').slice(0, 3);
    const num = soloDigitos === '' ? null : Number(soloDigitos);
    input.value = num !== null ? String(num) : '';
    this.conocimientoForm.controls.horas.setValue(num, { emitEvent: false });
    this.conocimientoForm.controls.horas.updateValueAndValidity();
  }

  filtrarHorasCurso(event: Event): void {
    const input = event.target as HTMLInputElement;
    const soloDigitos = input.value.replace(/[^0-9]/g, '').slice(0, 3);
    const num = soloDigitos === '' ? null : Number(soloDigitos);
    input.value = num !== null ? String(num) : '';
    this.cursoForm.controls.horas.setValue(num, { emitEvent: false });
    this.cursoForm.controls.horas.updateValueAndValidity();
  }

  /** Cantidad de experiencia: solo dígitos, máximo 2 (1–99). Bloquea -, +, e y otros caracteres. */
  filtrarCantidadExperiencia(event: Event): void {
    const input = event.target as HTMLInputElement;
    const soloDigitos = input.value.replace(/\D/g, '').slice(0, 2);
    const ctrl = this.experienciaForm.controls.cantidad;
    if (soloDigitos === '') {
      input.value = '';
      ctrl.setValue(null as unknown as number, { emitEvent: false });
    } else {
      const num = Number(soloDigitos);
      input.value = String(num);
      ctrl.setValue(num, { emitEvent: false });
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
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

  guardarCompetencia(): void {
    this.competenciaForm.markAllAsTouched();
    if (!this.competenciaForm.valid) return;
    const id = this.perfilId();
    if (!id) return;
    const raw = this.competenciaForm.getRawValue();
    const item: PerfilConocimientoRequest = {
      tipoConocimiento: 'COMPETENCIA',
      descripcion: String(raw.descripcion ?? '').trim(),
      horas: null,
      nivelDominio: 'NO_APLICA',
      orden: 0,
    };
    const idx = this.editingCompetenciaIndex();
    let list = [...this.competenciasGuardadas()];
    if (idx !== null) {
      list = list.map((c, i) => (i === idx ? { ...c, ...item } : c));
      this.editingCompetenciaIndex.set(null);
    } else {
      list = [...list, { ...item, idPerfilConocimiento: -(list.length + 1) } as PerfilConocimientoResponse];
    }
    this.competenciasGuardadas.set(list);
    this.competenciaForm.reset({ descripcion: '' });
    this.persistFormacionesConocimientosExperiencias();
  }

  editarCompetencia(index: number): void {
    const c = this.competenciasGuardadas()[index];
    this.competenciaForm.patchValue({ descripcion: c.descripcion });
    this.editingCompetenciaIndex.set(index);
  }

  cancelarEdicionCompetencia(): void {
    this.editingCompetenciaIndex.set(null);
    this.competenciaForm.reset({ descripcion: '' });
  }

  eliminarCompetencia(index: number): void {
    const list = this.competenciasGuardadas().filter((_, i) => i !== index);
    this.competenciasGuardadas.set(list);
    this.editingCompetenciaIndex.set(null);
    this.persistFormacionesConocimientosExperiencias();
  }

  guardarCurso(): void {
    this.cursoForm.markAllAsTouched();
    if (!this.cursoForm.valid) return;
    const id = this.perfilId();
    if (!id) return;
    const raw = this.cursoForm.getRawValue();
    const horas = raw.horas ?? null;
    const item: PerfilConocimientoRequest = {
      tipoConocimiento: 'CURSO',
      descripcion: String(raw.descripcion ?? '').trim(),
      horas,
      nivelDominio: 'NO_APLICA',
      orden: 0,
    };
    const idx = this.editingCursoIndex();
    let list = [...this.cursosGuardados()];
    if (idx !== null) {
      list = list.map((c, i) => (i === idx ? { ...c, ...item } : c));
      this.editingCursoIndex.set(null);
    } else {
      list = [...list, { ...item, idPerfilConocimiento: -(list.length + 1) } as PerfilConocimientoResponse];
    }
    this.cursosGuardados.set(list);
    this.cursoForm.reset({ descripcion: '', horas: null });
    this.persistFormacionesConocimientosExperiencias();
  }

  editarCurso(index: number): void {
    const c = this.cursosGuardados()[index];
    this.cursoForm.patchValue({
      descripcion: c.descripcion,
      horas: c.horas ?? null,
    });
    this.editingCursoIndex.set(index);
  }

  cancelarEdicionCurso(): void {
    this.editingCursoIndex.set(null);
    this.cursoForm.reset({ descripcion: '', horas: null });
  }

  eliminarCurso(index: number): void {
    const list = this.cursosGuardados().filter((_, i) => i !== index);
    this.cursosGuardados.set(list);
    this.editingCursoIndex.set(null);
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

  guardarFuncion(): void {
    this.funcionForm.markAllAsTouched();
    if (!this.funcionForm.valid) return;
    const id = this.perfilId();
    if (!id) return;
    const raw = this.funcionForm.getRawValue();
    const item: FuncionPuestoRequest = {
      descripcionFuncion: String(raw.descripcionFuncion ?? '').trim(),
      orden: 0,
    };
    const idx = this.editingFuncionIndex();
    let list = [...this.funcionesGuardadas()];
    if (idx !== null) {
      list = list.map((f, i) => (i === idx ? { ...f, descripcionFuncion: item.descripcionFuncion } : f));
      this.editingFuncionIndex.set(null);
    } else {
      list = [
        ...list,
        { idFuncionPuesto: -(list.length + 1), descripcionFuncion: item.descripcionFuncion, orden: list.length + 1 },
      ];
    }
    this.funcionesGuardadas.set(list);
    this.funcionForm.reset({ descripcionFuncion: '' });
    this.persistFormacionesConocimientosExperiencias();
  }

  editarFuncion(index: number): void {
    const f = this.funcionesGuardadas()[index];
    this.funcionForm.patchValue({ descripcionFuncion: f.descripcionFuncion });
    this.editingFuncionIndex.set(index);
  }

  cancelarEdicionFuncion(): void {
    this.editingFuncionIndex.set(null);
    this.funcionForm.reset({ descripcionFuncion: '' });
  }

  eliminarFuncion(index: number): void {
    const list = this.funcionesGuardadas().filter((_, i) => i !== index);
    this.funcionesGuardadas.set(list);
    this.editingFuncionIndex.set(null);
    this.persistFormacionesConocimientosExperiencias();
  }

  moverFuncionArriba(index: number): void {
    if (index <= 0) return;
    const list = [...this.funcionesGuardadas()];
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    this.funcionesGuardadas.set(list);
    this.persistFormacionesConocimientosExperiencias();
  }

  moverFuncionAbajo(index: number): void {
    const list = [...this.funcionesGuardadas()];
    if (index >= list.length - 1) return;
    [list[index], list[index + 1]] = [list[index + 1], list[index]];
    this.funcionesGuardadas.set(list);
    this.persistFormacionesConocimientosExperiencias();
  }

  guardarCondicion(): void {
    this.condicionForm.markAllAsTouched();
    if (!this.condicionForm.valid) return;
    const id = this.perfilId();
    if (!id) return;
    this.persistFormacionesConocimientosExperiencias();
  }

  editarCondicion(): void {
    this.condicionGuardada.set(false);
  }

  finalizar(): void {
    const id = this.perfilId();
    if (!id) return;
    const context = this.registroContext();
    if (!context) {
      this.toast.error('No se pudo resolver el contexto. Recargue la página.');
      return;
    }
    const mensaje = this.isEdit()
      ? 'Perfil de Puesto Actualizado y Notificado a ORH'
      : 'Perfil de Puesto Registrado correctamente y Notificado a ORH';
    const payload = this.buildFullRequest(context);
    this.saving.set(true);
    this.svc.actualizar(id, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: ApiResponse<PerfilPuestoResponse>) => {
        this.formacionesGuardadas.set(res.data.formacionesAcademicas ?? []);
        this.experienciasGuardadas.set(res.data.experiencias ?? []);
        this.funcionesGuardadas.set(res.data.funciones ?? []);
        this.applySplitConocimientos(res.data.conocimientos);
        this.condicionGuardada.set(true);
        this.saving.set(false);
        this.mensajeFinalizado.set(mensaje);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'No se pudo guardar. Verifique la consola.';
        this.toast.error(msg);
      },
    });
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
        this.experienciasGuardadas.set(res.data.experiencias ?? []);
        this.funcionesGuardadas.set(res.data.funciones ?? []);
        this.applySplitConocimientos(res.data.conocimientos);
        this.saving.set(false);
        this.condicionGuardada.set(true);
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
      requiereColegiatura: f.requiereColegiatura,
      requiereHabilitacionProfesional: f.requiereHabilitacionProfesional,
      orden: i + 1,
    }));
    const mergedConocimientosRaw: PerfilConocimientoResponse[] = [
      ...this.competenciasGuardadas(),
      ...this.cursosGuardados(),
      ...this.conocimientosGuardados(),
    ];
    const conocimientos: PerfilConocimientoRequest[] = mergedConocimientosRaw.map((c, i) => ({
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
    const funciones: FuncionPuestoRequest[] = this.funcionesGuardadas().map((f, i) => ({
      descripcionFuncion: f.descripcionFuncion,
      orden: i + 1,
    }));
    return {
      nombrePuesto: String(raw.nombrePuesto ?? '').trim(),
      denominacionPuesto: String(raw.denominacionPuesto ?? '').trim().toUpperCase(),
      unidadOrganica: context.unidadOrganica,
      idAreaSolicitante: context.idAreaSolicitante,
      idNivelPuesto: raw.idNivelPuesto ?? undefined,
      misionPuesto: String(raw.misionPuesto ?? '').trim(),
      cantidadPuestos: Number(raw.cantidadPuestos ?? 1),
      formacionesAcademicas: formaciones,
      conocimientos,
      experiencias,
      funciones,
      condicion: this.buildCondicionRequest(),
    };
  }

  private buildCondicionRequest(): CondicionPuestoRequest | undefined {
    if (!this.condicionForm.valid) return undefined;
    const raw = this.condicionForm.getRawValue();
    const dias = String(raw.diasLaborales ?? '').trim();
    const hi = String(raw.horarioInicio ?? '').trim();
    const hf = String(raw.horarioFin ?? '').trim();
    const modalidad = String(raw.modalidadServicio ?? '').trim();
    const tipoInicio = String(raw.tipoInicioContrato ?? '').trim();
    const horarioTriple =
      dias && hi && hf ? { diasLaborales: dias, horarioInicio: hi, horarioFin: hf } : {};
    return {
      remuneracionMensual: Number(raw.remuneracionMensual ?? 0),
      duracionContrato: this.formatearFechaEspanol(String(raw.duracionContrato ?? '').trim()),
      lugarPrestacion: String(raw.lugarPrestacion ?? '').trim(),
      jornadaSemanal: Number(raw.jornadaSemanal ?? 48),
      otrasCondiciones: String(raw.otrasCondiciones ?? '').trim() || undefined,
      ...horarioTriple,
      ...(modalidad ? { modalidadServicio: modalidad } : {}),
      ...(tipoInicio ? { tipoInicioContrato: tipoInicio } : {}),
    };
  }

  /** Convierte yyyy-MM-dd → "31 de diciembre de 2026" para el PDF */
  private formatearFechaEspanol(isoDate: string): string {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
    const [y, m, d] = isoDate.split('-').map(Number);
    const mes = PerfilFormComponent.MESES_ES[m] ?? '';
    return `${d} de ${mes} de ${y}`;
  }

  /** Convierte "31 de diciembre de 2026" → yyyy-MM-dd para el date picker */
  private parsearFechaEspanol(texto: string): string {
    if (!texto) return '';
    // Si ya viene en formato ISO, retornar directo
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    const mesesInv: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
    };
    const match = texto.match(/^(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})$/i);
    if (!match) return ''; // formato no reconocido, el usuario deberá re-seleccionar
    const dia = match[1].padStart(2, '0');
    const mes = mesesInv[match[2].toLowerCase()];
    const anio = match[3];
    if (!mes) return '';
    return `${anio}-${mes}-${dia}`;
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
    if (domainApplies) {
      hoursControl.clearValidators();
    } else {
      hoursControl.setValidators([Validators.required, Validators.min(0), Validators.max(999)]);
    }
    hoursControl.updateValueAndValidity({ emitEvent: false });
    levelControl.updateValueAndValidity({ emitEvent: false });
  }

  private loadContext(): void {
    this.loading.set(true);
    forkJoin({
      context: this.svc.obtenerContextoRegistro(),
      niveles: this.svc.listarNivelesPuesto(),
      denominaciones: this.svc.listarDenominacionesPuesto(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ context, niveles, denominaciones }) => {
        this.registroContext.set(context.data);
        this.form.controls.unidadOrganica.setValue(context.data.unidadOrganica);
        this.nivelPuestoOptions.set(
          (niveles.data ?? []).map((n: NivelPuestoResponse) => ({
            value: n.idNivelPuesto,
            label: `${n.codigo} — ${n.descripcion}`,
          }))
        );
        this.denominacionOptions.set(
          (denominaciones.data ?? []).map((d: DenominacionPuestoResponse) => ({
            value: d.codigo,
            label: d.descripcion,
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
          cantidadPuestos: data.cantidadPuestos,
          misionPuesto: data.misionPuesto,
        });
        this.datosGeneralesGuardado.set(true);
        this.formacionesGuardadas.set(data.formacionesAcademicas ?? []);
        this.experienciasGuardadas.set(data.experiencias ?? []);
        this.funcionesGuardadas.set(data.funciones ?? []);
        this.applySplitConocimientos(data.conocimientos);
        this.estadoRequerimientoAsociado.set(data.estadoRequerimientoAsociado ?? null);
        if (data.condicion) {
          this.condicionForm.patchValue({
            remuneracionMensual: data.condicion.remuneracionMensual ?? null,
            duracionContrato: this.parsearFechaEspanol(data.condicion.duracionContrato ?? ''),
            lugarPrestacion: 'Agencia de Compras de las Fuerzas Armadas en la Av. Arequipa 310 - Cercado – Lima',
            jornadaSemanal: data.condicion.jornadaSemanal ?? 48,
            diasLaborales: 'Lunes a viernes',
            horarioInicio: '08:30',
            horarioFin: '17:00',
            modalidadServicio: data.condicion.modalidadServicio ?? '',
            tipoInicioContrato: data.condicion.tipoInicioContrato ?? '',
            otrasCondiciones: data.condicion.otrasCondiciones ?? '',
          });
          this.condicionGuardada.set(true);
          this.mensajeFinalizado.set('Perfil de Puesto Actualizado y Notificado a ORH');
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar el perfil.');
      },
    });
  }

  /**
   * Backend devuelve un solo arreglo; la UI separa COMPETENCIA, CURSO y el resto (OFIMÁTICA, IDIOMA, OTRO).
   * Orden al reenviar: competencias → cursos → conocimientos (ver buildFullRequest).
   */
  private applySplitConocimientos(list: PerfilConocimientoResponse[] | undefined | null): void {
    const all = list ?? [];
    const competencias: PerfilConocimientoResponse[] = [];
    const cursos: PerfilConocimientoResponse[] = [];
    const otros: PerfilConocimientoResponse[] = [];
    for (const c of all) {
      const t = (c.tipoConocimiento ?? '').toUpperCase();
      if (t === 'COMPETENCIA') competencias.push(c);
      else if (t === 'CURSO') cursos.push(c);
      else otros.push(c);
    }
    this.competenciasGuardadas.set(competencias);
    this.cursosGuardados.set(cursos);
    this.conocimientosGuardados.set(otros);
  }
}
