import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '@core/http/api.service';
import { Page } from '@shared/models/pagination.model';
import {
  ConvocatoriaSeleccionItem,
  PostulacionSeleccion,
  FactorDetalle,
  ComiteDetalle,
  EvalCurricularRequest,
  EvalCurricularResponse,
  EvalTecnicaRequest,
  EvalTecnicaResponse,
  EntrevistaRequest,
  EntrevistaResponse,
  BonificacionResponse,
  CuadroMeritosResponse,
  PublicarResultadosResponse,
  VerificacionDl1451Request,
  RollbackAdminRequest,
  TachaRequest,
  TachaResponse,
  ResolverTachaRequest,
  ExpedienteItem,
  NotificarCodigosResponse,
  ComunicadoResponse,
  ComunicadoRequest,
} from '../models/seleccion.model';

@Injectable({ providedIn: 'root' })
export class SeleccionService {
  private readonly api = inject(ApiService);

  // ── E23 — Listar postulantes paginado ─────────────────────────────────────

  listarPostulantes(
    idConv: number,
    page = 0,
    size = 50,
  ): Observable<Page<PostulacionSeleccion>> {
    return this.api
      .getPage<PostulacionSeleccion>(`/convocatorias/${idConv}/postulantes`, { page, size })
      .pipe(map((r) => r.data));
  }

  // ── Dashboard — convocatorias PUBLICADAS con postulantes pendientes E19 ──────

  listarPendientesE19(): Observable<ConvocatoriaSeleccionItem[]> {
    return this.api
      .getPage<ConvocatoriaSeleccionItem>(
        '/convocatorias',
        { page: 0, size: 100, sort: 'fechaPublicacion,desc' },
        { estado: 'PUBLICADA' },
      )
      .pipe(
        map((r) =>
          (r.data?.content ?? []).filter(
            (c) => c.postulantesRegistrados && c.postulantesRegistrados > 0,
          ),
        ),
      );
  }

  // ── Dashboard ORH — avisos CODIGOS_LISTOS (postulantes listos para Evaluación Técnica E26) ─────────

  listarAvisosCodigosListos(): Observable<{ idNotificacion: number; asunto: string; idConvocatoria: number | null; numeroConvocatoria: string | null }[]> {
    return this.api
      .getPage<{ idNotificacion: number; tipoNotificacion: string; asunto: string; idConvocatoria?: number | null; numeroConvocatoria?: string | null }>(
        '/notificaciones',
        { page: 0, size: 50, sort: 'fechaCreacion,desc' },
        { estado: 'ENVIADA' },
      )
      .pipe(
        map((r) =>
          (r.data?.content ?? [])
            .filter((n) => n.tipoNotificacion === 'CODIGOS_LISTOS')
            .map((n) => ({
              idNotificacion: n.idNotificacion,
              asunto: n.asunto,
              idConvocatoria: n.idConvocatoria ?? null,
              numeroConvocatoria: n.numeroConvocatoria ?? null,
            })),
        ),
      );
  }

  // ── Dashboard ORH — convocatorias donde el COMITÉ notificó que la Entrevista está lista ──────────────

  listarPendientesEntrevistaOrh(): Observable<ConvocatoriaSeleccionItem[]> {
    return this.api
      .getPage<ConvocatoriaSeleccionItem>(
        '/convocatorias',
        { page: 0, size: 100, sort: 'fechaPublicacion,desc' },
        { estado: 'EN_SELECCION' },
      )
      .pipe(
        map((r) =>
          (r.data?.content ?? []).filter(
            (c) => c.notificacionEntrevistaEnviada && c.estado !== 'FINALIZADA',
          ),
        ),
      );
  }

  // ── Dashboard ORH — convocatorias EN_SELECCION con postulantes APTO pendientes de Código Anónimo E25 ──

  listarPendientesE25Orh(): Observable<ConvocatoriaSeleccionItem[]> {
    return this.api
      .getPage<ConvocatoriaSeleccionItem>(
        '/convocatorias',
        { page: 0, size: 100, sort: 'fechaPublicacion,desc' },
        { estado: 'EN_SELECCION' },
      )
      .pipe(
        map((r) =>
          (r.data?.content ?? []).filter(
            (c) => c.postulantesAptos && c.postulantesAptos > 0 && !c.notificacionCodigosEnviada,
          ),
        ),
      );
  }

  // ── Dashboard COMITÉ — convocatorias EN_SELECCION con postulantes VERIFICADO+ADMITIDO listos para E24 ──

  listarPendientesE24Comite(): Observable<ConvocatoriaSeleccionItem[]> {
    return this.api
      .getPage<ConvocatoriaSeleccionItem>(
        '/convocatorias',
        { page: 0, size: 100, sort: 'fechaPublicacion,desc' },
        { estado: 'EN_SELECCION' },
      )
      .pipe(
        map((r) =>
          (r.data?.content ?? []).filter(
            (c) => c.postulantesVerificados && c.postulantesVerificados > 0 && !c.resultadosCurricularPublicados,
          ),
        ),
      );
  }

  // ── Convocatoria — obtener estado + pesos RF-14 ───────────────────────────

  obtenerConvocatoria(idConv: number): Observable<ConvocatoriaSeleccionItem> {
    return this.api
      .get<ConvocatoriaSeleccionItem>(`/convocatorias/${idConv}`)
      .pipe(map((r) => r.data));
  }

  // ── E19 — Verificar D.L. 1451 ────────────────────────────────────────────

  obtenerPostulacion(idPost: number): Observable<PostulacionSeleccion> {
    return this.api
      .get<PostulacionSeleccion>(`/postulaciones/${idPost}`)
      .pipe(map((r) => r.data));
  }

  verificarDl1451(
    idPost: number,
    req: VerificacionDl1451Request,
  ): Observable<PostulacionSeleccion> {
    return this.api
      .post<PostulacionSeleccion>(`/postulaciones/${idPost}/verificar-dl1451`, req)
      .pipe(map((r) => r.data));
  }

  // ── E20 — Filtro Requisitos Mínimos RF-07 (masivo — conservado para compatibilidad) ──
  // Backend retorna PostulacionResponse: { idConvocatoria, estado, mensaje }
  // NO retorna FiltroRequisitosResponse — el servicio Java usa PostulacionResponse.builder()

  filtroRequisitos(idConv: number): Observable<PostulacionSeleccion> {
    return this.api
      .post<PostulacionSeleccion>(`/convocatorias/${idConv}/filtro-requisitos`, {})
      .pipe(map((r) => r.data));
  }

  // ── E20-Individual — Filtro RF-07 por postulante ──────────────────────────
  // decision: 'ADMITIR' (→ VERIFICADO) | 'NO_ADMITIR' (→ NO_APTO)

  aplicarFiltroIndividual(
    idPost: number,
    decision: 'ADMITIR' | 'NO_ADMITIR',
  ): Observable<PostulacionSeleccion> {
    return this.api
      .post<PostulacionSeleccion>(`/postulaciones/${idPost}/aplicar-filtro`, { decision })
      .pipe(map((r) => r.data));
  }

  // ── E21/E22 — Tachas ─────────────────────────────────────────────────────

  registrarTacha(idConv: number, req: TachaRequest): Observable<TachaResponse> {
    return this.api
      .post<TachaResponse>(`/convocatorias/${idConv}/tachas`, req)
      .pipe(map((r) => r.data));
  }

  resolverTacha(idTacha: number, req: ResolverTachaRequest): Observable<TachaResponse> {
    return this.api
      .put<TachaResponse>(`/tachas/${idTacha}/resolver`, req)
      .pipe(map((r) => r.data));
  }

  listarTachas(idConv: number): Observable<TachaResponse[]> {
    return this.api
      .get<TachaResponse[]>(`/convocatorias/${idConv}/tachas`)
      .pipe(map((r) => r.data));
  }

  // ── E24 — Evaluación Curricular RF-09 ─────────────────────────────────────

  evalCurricular(
    idConv: number,
    req: EvalCurricularRequest,
  ): Observable<EvalCurricularResponse> {
    return this.api
      .post<EvalCurricularResponse>(`/convocatorias/${idConv}/eval-curricular`, req)
      .pipe(map((r) => r.data));
  }

  // ── E25 — Códigos Anónimos RF-10 ─────────────────────────────────────────

  asignarCodigosAnonimos(idConv: number): Observable<PostulacionSeleccion[]> {
    return this.api
      .post<PostulacionSeleccion[]>(`/convocatorias/${idConv}/codigos-anonimos`, {})
      .pipe(map((r) => r.data));
  }

  /** E25-NOTIF — ORH notifica al COMITÉ que los códigos están listos */
  notificarCodigosAnonimos(idConv: number): Observable<NotificarCodigosResponse> {
    return this.api
      .post<NotificarCodigosResponse>(`/convocatorias/${idConv}/notificar-codigos-anonimos`, {})
      .pipe(map((r) => r.data));
  }

  // ── E26 — Evaluación Técnica Anónima RF-11 ───────────────────────────────

  evalTecnica(idConv: number, req: EvalTecnicaRequest): Observable<EvalTecnicaResponse> {
    return this.api
      .post<EvalTecnicaResponse>(`/convocatorias/${idConv}/eval-tecnica`, req)
      .pipe(map((r) => r.data));
  }

  /** POST — publica resultados E26 (persiste flag) y retorna PDF */
  publicarResultadosTecnica(idConv: number): Observable<Blob> {
    return this.api.postBlob(`/convocatorias/${idConv}/publicar-resultados-tecnica`, {});
  }

  /** GET — re-descarga PDF técnico (ya publicado anteriormente) */
  resultadosTecnicaPdf(idConv: number): Observable<Blob> {
    return this.api.getBlob(`/convocatorias/${idConv}/resultados-tecnica-pdf`);
  }

  // ── E27 — Entrevista Personal RF-13 + Publicación ────────────────────────

  entrevistas(idConv: number, req: EntrevistaRequest): Observable<EntrevistaResponse> {
    return this.api
      .post<EntrevistaResponse>(`/convocatorias/${idConv}/entrevistas`, req)
      .pipe(map((r) => r.data));
  }

  /** E27-NOTIF — COMITÉ notifica a ORH que la entrevista está lista */
  notificarEntrevistaOrh(idConv: number): Observable<NotificarCodigosResponse> {
    return this.api
      .post<NotificarCodigosResponse>(`/convocatorias/${idConv}/notificar-entrevista-orh`, {})
      .pipe(map((r) => r.data));
  }

  /** POST — publica resultados E27 (persiste flag) y retorna PDF */
  publicarResultadosEntrevista(idConv: number): Observable<Blob> {
    return this.api.postBlob(`/convocatorias/${idConv}/publicar-resultados-entrevista`, {});
  }

  /** GET — re-descarga PDF entrevista (ya publicado anteriormente) */
  resultadosEntrevistaPdf(idConv: number): Observable<Blob> {
    return this.api.getBlob(`/convocatorias/${idConv}/resultados-entrevista-pdf`);
  }

  // ── E28 — Bonificaciones RF-15 ────────────────────────────────────────────

  bonificaciones(idConv: number): Observable<BonificacionResponse> {
    return this.api
      .post<BonificacionResponse>(`/convocatorias/${idConv}/bonificaciones`, {})
      .pipe(map((r) => r.data));
  }

  // ── E29 — Cuadro de Méritos RF-16 ────────────────────────────────────────

  /** GET — re-entry read-only: lee cuadro ya calculado sin recalcular */
  obtenerCuadroMeritos(idConv: number): Observable<CuadroMeritosResponse> {
    return this.api
      .get<CuadroMeritosResponse>(`/convocatorias/${idConv}/cuadro-meritos`)
      .pipe(map((r) => r.data));
  }

  cuadroMeritos(idConv: number): Observable<CuadroMeritosResponse> {
    return this.api
      .post<CuadroMeritosResponse>(`/convocatorias/${idConv}/cuadro-meritos`, {})
      .pipe(map((r) => r.data));
  }

  // ── E24-PDF — PDF de resultados curriculares (COMITÉ descarga) ───────────

  /** POST — publica resultados E24 (persiste flag) y retorna PDF */
  publicarResultadosCurricular(idConv: number): Observable<Blob> {
    return this.api.postBlob(`/convocatorias/${idConv}/publicar-resultados-curricular`, {});
  }

  /** GET — re-descarga PDF curricular (ya publicado anteriormente) */
  resultadosCurricularPdf(idConv: number): Observable<Blob> {
    return this.api.getBlob(`/convocatorias/${idConv}/resultados-curricular-pdf`);
  }

  // ── E30 — PDF de resultados ───────────────────────────────────────────────

  resultadosPdf(idConv: number): Observable<Blob> {
    return this.api.getBlob(`/convocatorias/${idConv}/resultados-pdf`);
  }

  // ── E31 — Publicar Resultados ─────────────────────────────────────────────

  publicarResultados(idConv: number): Observable<PublicarResultadosResponse> {
    return this.api
      .post<PublicarResultadosResponse>(`/convocatorias/${idConv}/publicar-resultados`, {})
      .pipe(map((r) => r.data));
  }

  // ── Expediente — lectura por COMITÉ/ORH ──────────────────────────────────

  listarExpedientePostulante(idPost: number): Observable<ExpedienteItem[]> {
    return this.api
      .get<ExpedienteItem[]>(`/postulaciones/${idPost}/expediente`)
      .pipe(map((r) => r.data));
  }

  /** Descarga un archivo del expediente como Blob — pasa por authInterceptor con JWT */
  descargarExpedienteBlob(idPost: number, idExp: number): Observable<Blob> {
    return this.api.getBlob(`/postulaciones/${idPost}/expediente/${idExp}/descargar`);
  }

  // ── Rollback Administrativo — solo ADMIN/ORH ──────────────────────────────

  rollbackAdmin(idPost: number, req: RollbackAdminRequest): Observable<PostulacionSeleccion> {
    return this.api
      .post<PostulacionSeleccion>(`/postulaciones/${idPost}/rollback-admin`, req)
      .pipe(map((r) => r.data));
  }

  // ── Auxiliares ────────────────────────────────────────────────────────────

  listarFactores(idConv: number): Observable<FactorDetalle[]> {
    return this.api
      .get<FactorDetalle[]>(`/convocatorias/${idConv}/factores`)
      .pipe(map((r) => r.data));
  }

  obtenerComite(idConv: number): Observable<ComiteDetalle> {
    return this.api
      .get<ComiteDetalle>(`/convocatorias/${idConv}/comite`)
      .pipe(map((r) => r.data));
  }

  // ── Comunicados DS 083-2019-PCM Art. 10 ─────────────────────────────────────

  publicarComunicado(idConv: number, req: ComunicadoRequest): Observable<ComunicadoResponse> {
    return this.api
      .post<ComunicadoResponse>(`/convocatorias/${idConv}/comunicados`, req)
      .pipe(map((r) => r.data));
  }

  listarComunicados(idConv: number): Observable<ComunicadoResponse[]> {
    return this.api
      .get<ComunicadoResponse[]>(`/convocatorias/${idConv}/comunicados`)
      .pipe(map((r) => r.data ?? []));
  }

}
