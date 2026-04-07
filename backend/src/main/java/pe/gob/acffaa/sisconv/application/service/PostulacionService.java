package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.application.dto.request.*;
import pe.gob.acffaa.sisconv.application.dto.response.*;
import pe.gob.acffaa.sisconv.application.mapper.SeleccionMapper;
import pe.gob.acffaa.sisconv.application.port.IAuditPort;
import pe.gob.acffaa.sisconv.domain.exception.*;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import pe.gob.acffaa.sisconv.domain.enums.EstadoPostulacion;
import pe.gob.acffaa.sisconv.domain.model.*;
import pe.gob.acffaa.sisconv.domain.repository.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

/**
 * PostulacionService — PKG-03 Etapa 3: E17-E23.
 * Postulacion, Expediente, Verificacion D.L. 1451, Filtro, Tachas.
 * Coherencia: DDL_NEW.sql, PKG03_CONTRATO.md, Diagrama Flujo Etapa 3.
 */
@Service
public class PostulacionService {

    @Value("${app.storage.base-path:${user.dir}/sisconv-uploads}")
    private String storagePath;

    private final IPostulacionRepository postRepo;
    private final IPostulanteRepository postulanteRepo;
    private final IConvocatoriaRepository convRepo;
    private final IDeclaracionJuradaRepository ddjjRepo;
    private final IExpedienteVirtualRepository expRepo;
    private final ITachaRepository tachaRepo;
    private final IUsuarioRepository usuarioRepo;
    private final IAuditPort audit;
    private final SeleccionMapper mapper;
    private final NotificacionService notificacionService;
    private final IEvaluacionCurricularRepository evalCurrRepo;
    private final IConfigExamenRepository configExamenRepo;
    private final IExamenPostulanteRepository examenPostulanteRepo;

    public PostulacionService(IPostulacionRepository postRepo, IPostulanteRepository postulanteRepo,
            IConvocatoriaRepository convRepo, IDeclaracionJuradaRepository ddjjRepo,
            IExpedienteVirtualRepository expRepo, ITachaRepository tachaRepo,
            IUsuarioRepository usuarioRepo,
            IAuditPort audit, SeleccionMapper mapper,
            NotificacionService notificacionService,
            IEvaluacionCurricularRepository evalCurrRepo,
            IConfigExamenRepository configExamenRepo,
            IExamenPostulanteRepository examenPostulanteRepo) {
        this.postRepo = postRepo; this.postulanteRepo = postulanteRepo;
        this.convRepo = convRepo; this.ddjjRepo = ddjjRepo;
        this.expRepo = expRepo; this.tachaRepo = tachaRepo;
        this.usuarioRepo = usuarioRepo;
        this.audit = audit; this.mapper = mapper;
        this.notificacionService = notificacionService;
        this.evalCurrRepo = evalCurrRepo;
        this.configExamenRepo = configExamenRepo;
        this.examenPostulanteRepo = examenPostulanteRepo;
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }

    /** Retorna true si el usuario autenticado es un rol interno (ORH, ADMIN, COMITE) — no es Postulante. */
    private boolean esRolInterno() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> {
                    String rol = a.getAuthority();
                    return "ROLE_ADMIN".equals(rol) || "ROLE_ORH".equals(rol) || "ROLE_COMITE".equals(rol);
                });
    }

    private Postulante obtenerPostulanteAutenticado() {
        Usuario usuario = usuarioRepo.findByUsername(user())
                .orElseThrow(() -> new DomainException("Usuario autenticado no encontrado"));
    
        return postulanteRepo.findByUsuario_IdUsuario(usuario.getIdUsuario())
                .orElseThrow(() -> new DomainException("No existe postulante asociado al usuario autenticado"));
    }
    
    private void validarAccesoPropio(Postulacion postulacion) {
        Postulante postulante = obtenerPostulanteAutenticado();
        Long idPostulanteActual = postulante.getIdPostulante();
        Long idPostulanteRegistro = postulacion.getPostulante() != null
                ? postulacion.getPostulante().getIdPostulante()
                : null;
    
        if (!Objects.equals(idPostulanteActual, idPostulanteRegistro)) {
            throw new DomainException("No tiene acceso a esta postulación");
        }
    }
    
    private PostulacionResponse enrichPostulacionResponse(Postulacion postulacion, String mensaje) {
        PostulacionResponse response = mapper.toPostulacionResponse(postulacion, mensaje);
    
        int totalExpedientes = (int) expRepo.countByPostulacionId(postulacion.getIdPostulacion());
        String estadoExpediente = resolveEstadoExpediente(postulacion, totalExpedientes);
        String estadoPostulacionVisible = resolveEstadoPostulacionVisible(postulacion, estadoExpediente);
    
        response.setTotalExpedientes(totalExpedientes);
        response.setEstadoExpediente(estadoExpediente);
        response.setEstadoPostulacionVisible(estadoPostulacionVisible);
        response.setFechaConfirmacionExpediente(postulacion.getFechaConfirmacionExpediente());

        // V34 — Examen virtual: enriquecer si la convocatoria tiene examen habilitado
        Convocatoria conv = postulacion.getConvocatoria();
        if (Boolean.TRUE.equals(conv.getExamenVirtualHabilitado()) && "APTO".equals(postulacion.getEstado())) {
            configExamenRepo.findByConvocatoriaId(conv.getIdConvocatoria()).ifPresent(cfg -> {
                if ("PUBLICADO".equals(cfg.getEstado())) {
                    response.setExamenVirtualDisponible(true);
                    examenPostulanteRepo.findByConfigExamenIdAndPostulacionId(
                            cfg.getIdConfigExamen(), postulacion.getIdPostulacion()
                    ).ifPresent(ep -> response.setEstadoExamen(ep.getEstado()));
                }
            });
        }

        return response;
    }

    private String resolveEstadoExpediente(Postulacion postulacion, int totalExpedientes) {
        if (totalExpedientes == 0) {
            return "EXPEDIENTE PENDIENTE";
        }
    
        if (postulacion.getFechaConfirmacionExpediente() != null) {
            return "EXPEDIENTE COMPLETO";
        }
    
        return "EXPEDIENTE EN CARGA";
    }
    
    private String resolveEstadoPostulacionVisible(Postulacion postulacion, String estadoExpediente) {
        if ("REGISTRADO".equals(postulacion.getEstado()) && "EXPEDIENTE COMPLETO".equals(estadoExpediente)) {
            return "POSTULACIÓN EXITOSA";
        }
    
        return postulacion.getEstado();
    }
    
            /** Valida transición de estado Statechart antes de aplicar cambio — FIX #3 */
            private void validarTransicion(Postulacion p, String nuevoEstado) {
                EstadoPostulacion actual = EstadoPostulacion.valueOf(p.getEstado());
                EstadoPostulacion destino = EstadoPostulacion.valueOf(nuevoEstado);
                if (!actual.puedeTransicionarA(destino)) {
                    throw new DomainException("Transicion de estado no permitida: " + p.getEstado() + " → " + nuevoEstado);
                }
            }

            /** E17 — POST /postulaciones. CU-12. Registrar postulacion + 3 DDJJ */
            @Transactional
            public PostulacionResponse registrar(PostulacionRequest req, HttpServletRequest http) {
                Convocatoria conv = convRepo.findById(req.getIdConvocatoria())
                        .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", req.getIdConvocatoria()));
                if (conv.getEstado() != EstadoConvocatoria.PUBLICADA
                        && conv.getEstado() != EstadoConvocatoria.EN_SELECCION)
                    throw new DomainException("Convocatoria no esta en estado PUBLICADA o EN_SELECCION");

                // RN-11: Verificar 3 DDJJ obligatorias
                if (req.getDeclaracionesJuradas() == null || req.getDeclaracionesJuradas().size() != 3)
                    throw new DomainException("Se requieren exactamente 3 declaraciones juradas (VERACIDAD, ANTECEDENTES, NEPOTISMO)");
                for (PostulacionRequest.DdjjItem dj : req.getDeclaracionesJuradas()) {
                    if (!Boolean.TRUE.equals(dj.getAceptada()))
                        throw new DomainException("Todas las declaraciones juradas deben ser aceptadas");
                }

                // Buscar o crear postulante
                Postulante postulante = postulanteRepo.findByTipoDocumentoAndNumeroDocumento(
                        req.getTipoDocumento(), req.getNumeroDocumento())
                        .orElseGet(() -> postulanteRepo.save(Postulante.builder()
                                .tipoDocumento(req.getTipoDocumento())
                                .numeroDocumento(req.getNumeroDocumento())
                                .nombres(req.getNombres())
                                .apellidoPaterno(req.getApellidoPaterno())
                                .apellidoMaterno(req.getApellidoMaterno())
                                .email(req.getEmail())
                                .telefono(req.getTelefono())
                                .genero(req.getGenero())
                                .fechaNacimiento(req.getFechaNacimiento())
                                .direccion(req.getDireccion())
                                .ubigeo(req.getUbigeo())
                                .esLicenciadoFfaa(Boolean.TRUE.equals(req.getEsLicenciadoFfaa()))
                                .esPersonaDiscap(Boolean.TRUE.equals(req.getEsPersonaDiscap()))
                                .esDeportistaDest(Boolean.TRUE.equals(req.getEsDeportistaDest()))
                                .usuarioCreacion(user())
                                .build()));

                // RN-10: UK convocatoria+postulante
                postRepo.findByConvocatoriaIdAndPostulanteId(conv.getIdConvocatoria(), postulante.getIdPostulante())
                        .ifPresent(p -> { throw new DomainException("El postulante ya se encuentra registrado en esta convocatoria"); });

                Postulacion post = postRepo.save(Postulacion.builder()
                        .convocatoria(conv).postulante(postulante)
                        .estado("REGISTRADO").usuarioCreacion(user()).build());

                // Guardar DDJJ
                String ip = http.getRemoteAddr();
                for (PostulacionRequest.DdjjItem dj : req.getDeclaracionesJuradas()) {
                    ddjjRepo.save(DeclaracionJurada.builder()
                            .postulacion(post).tipoDeclaracion(dj.getTipoDeclaracion())
                            .aceptada(dj.getAceptada()).ipAceptacion(ip).build());
                }

                audit.registrar("POSTULACION", post.getIdPostulacion(), "CREAR", null, "REGISTRADO", http, null);
                notificacionService.notificarPostulacionPendienteExpediente(post, user());
                return enrichPostulacionResponse(post, "Postulación registrada. Debe completar el expediente virtual para continuar.");
            }

            /** E18 — POST /postulaciones/{id}/expediente. CU-13. Carga multipart + SHA-256 */
            @Transactional
            public ExpedienteResponse cargarExpediente(Long idPost, String tipoDoc, String nombreArchivo, byte[] contenido, HttpServletRequest http) {
                Postulacion post = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));

                validarAccesoPropio(post);

                if (post.getFechaConfirmacionExpediente() != null) {
                    throw new DomainException("El expediente ya fue finalizado y no admite nuevas cargas");
                }

                if (contenido == null || contenido.length == 0) {
                    throw new DomainException("El archivo no puede estar vacio");
                }

                String ext = nombreArchivo.contains(".")
                        ? nombreArchivo.substring(nombreArchivo.lastIndexOf("."))
                        : "";

                String hash = sha256(contenido);
                String ruta = "expedientes/" + post.getIdPostulacion() + "/" + nombreArchivo;

                // Escribir archivo al disco
                try {
                    Path destino = Paths.get(storagePath).resolve(ruta);
                    Files.createDirectories(destino.getParent());
                    Files.write(destino, contenido);
                } catch (IOException e) {
                    throw new DomainException("Error al guardar el archivo en disco: " + e.getMessage());
                }

                ExpedienteVirtual exp = expRepo.save(ExpedienteVirtual.builder()
                        .postulacion(post)
                        .tipoDocumento(tipoDoc)
                        .nombreArchivo(nombreArchivo)
                        .extension(ext)
                        .tamanoKb((long) Math.max(1, contenido.length / 1024))
                        .hashSha256(hash)
                        .rutaArchivo(ruta)
                        .verificado(false)
                        .estado("CARGADO")
                        .usuarioCreacion(user())
                        .build());

                audit.registrar("EXPEDIENTE", exp.getIdExpediente(), "CARGAR", http);

                return mapper.toExpedienteResponse(
                        exp,
                        "Expediente cargado exitosamente. Hash: " + hash
                );
            }
            /** E19 — POST /postulaciones/{id}/verificar-dl1451. CU-14. D.L. 1451 RNSSC/REGIPREC
             *  Solo graba los flags de inhabilitación. NO cambia estado.
             *  El estado cambia en E20 (filtroRequisitos): SIN_SANCIONES → VERIFICADO, CON_SANCIONES → NO_APTO.
             *  La observacion del evaluador queda en OBSERVACION_DL (SERVIR/OCI). */
            @Transactional
            public PostulacionResponse verificarDl1451(Long idPost, VerificacionDl1451Request req, HttpServletRequest http) {
                Postulacion post = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));

                String ant = post.getEstado();
                post.setVerificacionRnssc(req.getVerificacionRnssc());
                post.setVerificacionRegiprec(req.getVerificacionRegiprec());
                post.setFechaVerificacionDl(LocalDateTime.now());
                post.setObservacionDl(req.getObservacion());
                post.setUsuarioModificacion(user());

                boolean conSanciones = "CON_SANCIONES".equals(req.getVerificacionRnssc())
                                    || "CON_SANCIONES".equals(req.getVerificacionRegiprec());

                // Auto-transición: CON_SANCIONES → VERIFICADO inmediato (admisionRf07=NULL → display "VERIFICADO (NO APTO)")
                if (conSanciones && "REGISTRADO".equals(post.getEstado())) {
                    validarTransicion(post, "VERIFICADO");
                    post.setEstado("VERIFICADO");
                }

                postRepo.save(post);

                String estadoFinal = post.getEstado();
                String sustento = "RNSSC=" + req.getVerificacionRnssc()
                        + ",REGIPREC=" + req.getVerificacionRegiprec()
                        + (req.getObservacion() != null && !req.getObservacion().isBlank()
                           ? ",OBS=" + req.getObservacion() : "");
                audit.registrar("POSTULACION", post.getIdPostulacion(), "VERIFICAR_DL1451", ant, estadoFinal, http, sustento);
                return mapper.toPostulacionResponse(post,
                        conSanciones ? "D.L. 1451: sanciones registradas. Estado → VERIFICADO (NO APTO). Bloqueado de E24."
                                     : "D.L. 1451 OK — sin sanciones. Ejecute RF-07 para admitir o no admitir al postulante.");
            }

            /** E20 — POST /convocatorias/{id}/filtro-requisitos. CU-15, Motor RF-07
             *  Lee postulantes REGISTRADO (no APTO — E19 ya no cambia estado).
             *  Aplica DL1451: CON_SANCIONES → NO_APTO, SIN_SANCIONES/sin verificar → VERIFICADO. */
            @Transactional
            public PostulacionResponse filtroRequisitos(Long idConv, HttpServletRequest http) {
                Convocatoria conv = convRepo.findById(idConv)
                        .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
                List<Postulacion> registrados = postRepo.findByConvocatoriaIdAndEstado(idConv, "REGISTRADO");
                if (registrados.isEmpty()) {
                    if (conv.getEstado() == EstadoConvocatoria.PUBLICADA) {
                        conv.setEstado(EstadoConvocatoria.EN_SELECCION);
                        conv.setUsuarioModificacion(user());
                        convRepo.save(conv);
                        audit.registrarConvocatoria(idConv, "CONVOCATORIA", idConv, "INICIO_SELECCION",
                                EstadoConvocatoria.PUBLICADA.name(), EstadoConvocatoria.EN_SELECCION.name(),
                                "No hay postulantes REGISTRADO pendientes. Convocatoria → EN_SELECCION", http);
                    }
                    return PostulacionResponse.builder()
                            .idConvocatoria(idConv).estado("EN_SELECCION")
                            .mensaje("No hay postulantes REGISTRADO pendientes. Convocatoria → EN_SELECCION.").build();
                }

                int verificados = 0, noAptos = 0;
                for (Postulacion p : registrados) {
                    String ant = p.getEstado();
                    boolean conSanciones = "CON_SANCIONES".equals(p.getVerificacionRnssc())
                                       || "CON_SANCIONES".equals(p.getVerificacionRegiprec());
                    String nuevoEstado = conSanciones ? "NO_APTO" : "VERIFICADO";
                    validarTransicion(p, nuevoEstado);
                    p.setEstado(nuevoEstado);
                    p.setUsuarioModificacion(user());
                    postRepo.save(p);
                    audit.registrar("POSTULACION", p.getIdPostulacion(), "FILTRO_REQUISITOS", ant, nuevoEstado, http,
                            conSanciones ? "DL1451_CON_SANCIONES" : null);
                    if (conSanciones) noAptos++; else verificados++;
                }

                if (conv.getEstado() == EstadoConvocatoria.PUBLICADA) {
                    EstadoConvocatoria destino = EstadoConvocatoria.EN_SELECCION;
                    if (!conv.getEstado().puedeTransicionarA(destino)) {
                        throw new DomainException("Transición inválida: " + conv.getEstado() + " → " + destino);
                    }
                    conv.setEstado(destino);
                    conv.setUsuarioModificacion(user());
                    convRepo.save(conv);
                    audit.registrarConvocatoria(idConv, "CONVOCATORIA", idConv, "INICIO_SELECCION",
                            EstadoConvocatoria.PUBLICADA.name(), EstadoConvocatoria.EN_SELECCION.name(),
                            "Inicio del proceso de selección — filtro de requisitos completado", http);
                }

                return PostulacionResponse.builder()
                        .idConvocatoria(idConv).estado("EN_SELECCION")
                        .mensaje("Filtro completado. Verificados: " + verificados + ", No aptos (DL1451): " + noAptos).build();
            }

            /** E20-Individual — POST /postulaciones/{id}/aplicar-filtro. CU-15 individual.
             *  Prerequisito: estado=REGISTRADO con DL1451 completado (flags grabados por E19).
             *  Ambas decisiones transicionan REGISTRADO → VERIFICADO (como hacía el E20 masivo).
             *  ADMITIR:     admisionRf07=ADMITIDO    → habilita Gate E24
             *  NO_ADMITIR:  admisionRf07=NO_ADMITIDO → bloqueado de E24
             *  Gate E24: estado=VERIFICADO AND admisionRf07=ADMITIDO */
            @Transactional
            public PostulacionResponse aplicarFiltroIndividual(Long idPost, AplicarFiltroRequest req, HttpServletRequest http) {
                Postulacion post = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));

                if (!"REGISTRADO".equals(post.getEstado())) {
                    throw new DomainException(
                        "Solo se puede aplicar RF-07 a postulantes en estado REGISTRADO. Estado actual: " + post.getEstado());
                }

                if (post.getVerificacionRnssc() == null || post.getVerificacionRegiprec() == null) {
                    throw new DomainException("Debe completar la verificación D.L. 1451 (E19) antes de aplicar el filtro RF-07.");
                }

                if ("ADMITIR".equals(req.getDecision())) {
                    boolean conSanciones = "CON_SANCIONES".equals(post.getVerificacionRnssc())
                                       || "CON_SANCIONES".equals(post.getVerificacionRegiprec());
                    if (conSanciones) {
                        throw new DomainException("No se puede admitir: el postulante tiene sanciones registradas en D.L. 1451.");
                    }
                    post.setAdmisionRf07("ADMITIDO");
                } else {
                    post.setAdmisionRf07("NO_ADMITIDO");
                }

                // Ambas decisiones transicionan REGISTRADO → VERIFICADO
                String estadoAnterior = post.getEstado();
                validarTransicion(post, "VERIFICADO");
                post.setEstado("VERIFICADO");
                post.setUsuarioModificacion(user());
                postRepo.save(post);

                audit.registrar("POSTULACION", post.getIdPostulacion(), "FILTRO_RF07_INDIVIDUAL",
                        estadoAnterior, "VERIFICADO", http,
                        "ADMISION_RF07=" + post.getAdmisionRf07());

                return mapper.toPostulacionResponse(post,
                        "ADMITIDO".equals(post.getAdmisionRf07())
                                ? "Postulante admitido (RF-07) — estado → VERIFICADO, habilitado para Evaluación Curricular."
                                : "Postulante no admitido (RF-07) — estado → VERIFICADO, bloqueado de Evaluación Curricular.");
            }

            /** E21 — POST /convocatorias/{id}/tachas. CU-16. */
            @Transactional
            public TachaResponse registrarTacha(Long idConv, TachaRequest req, HttpServletRequest http) {
                Convocatoria conv = convRepo.findById(idConv)
                        .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
                if (!"EN_SELECCION".equals(conv.getEstado()))
                    throw new DomainException("Convocatoria no esta EN_SELECCION");
                Postulacion post = postRepo.findById(req.getIdPostulacion())
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", req.getIdPostulacion()));

                Tacha tacha = tachaRepo.save(Tacha.builder()
                        .convocatoria(conv).postulacion(post)
                        .motivo(req.getMotivo()).evidencia(req.getEvidencia())
                        .rutaAdjunto(req.getRutaAdjunto())
                        .estado("PRESENTADA").usuarioCreacion(user()).build());

                audit.registrar("TACHA", tacha.getIdTacha(), "CREAR", null, "PRESENTADA", http, null);
                return mapper.toTachaResponse(tacha, "Tacha registrada exitosamente");
            }

            /** E22 — PUT /tachas/{id}/resolver. CU-16. */
            @Transactional
            public TachaResponse resolverTacha(Long idTacha, ResolverTachaRequest req, HttpServletRequest http) {
                Tacha tacha = tachaRepo.findById(idTacha)
                        .orElseThrow(() -> new ResourceNotFoundException("Tacha", idTacha));
                if (!"PRESENTADA".equals(tacha.getEstado()))
                    throw new DomainException("Tacha ya fue resuelta");
                if (!"FUNDADA".equals(req.getEstado()) && !"INFUNDADA".equals(req.getEstado()))
                    throw new DomainException("Estado debe ser FUNDADA o INFUNDADA");

                String ant = tacha.getEstado();
                tacha.setEstado(req.getEstado());
                tacha.setResolucion(req.getResolucion());
                tacha.setFechaResolucion(LocalDateTime.now());

                // FK ID_USUARIO_RESOLUCION → buscar por username
                usuarioRepo.findByUsername(user()).ifPresent(tacha::setUsuarioResolucion);

                tachaRepo.save(tacha);

                if ("FUNDADA".equals(req.getEstado())) {
                    Postulacion post = tacha.getPostulacion();
                    String antPost = post.getEstado();
                    validarTransicion(post, "DESCALIFICADO");
                    post.setEstado("DESCALIFICADO");
                    post.setUsuarioModificacion(user());
                    postRepo.save(post);
                    audit.registrar("POSTULACION", post.getIdPostulacion(), "DESCALIFICAR", antPost, "DESCALIFICADO", http,
                            "Tacha FUNDADA: " + req.getResolucion());
                }

                audit.registrar("TACHA", tacha.getIdTacha(), "RESOLVER", ant, req.getEstado(), http, null);
                return mapper.toTachaResponse(tacha, "Tacha resuelta: " + req.getEstado());
            }

            /** E23 — GET /convocatorias/{id}/postulantes. Paginado.
             *  Para APTO/NO_APTO enriquece con desglose de scores curriculares (E24 modoResultados). */
            public Page<PostulacionResponse> listarPostulantes(Long idConv, Pageable pageable) {
                convRepo.findById(idConv)
                        .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
                return postRepo.findByConvocatoriaId(idConv, pageable)
                        .map(p -> {
                            // Enriquecer con desglose curricular para estados que pasaron E24
                            // Incluye estados post-E31 (GANADOR/ACCESITARIO/NO_SELECCIONADO/DESCALIFICADO)
                            // para que E24 modoResultados muestre scores aunque el proceso haya finalizado
                            boolean pasoPorE24 = "APTO".equals(p.getEstado())
                                    || "NO_APTO".equals(p.getEstado())
                                    || "GANADOR".equals(p.getEstado())
                                    || "ACCESITARIO".equals(p.getEstado())
                                    || "NO_SELECCIONADO".equals(p.getEstado())
                                    || "DESCALIFICADO".equals(p.getEstado());
                            if (pasoPorE24) {
                                return mapper.toPostulacionResponse(p,
                                        evalCurrRepo.findByPostulacionId(p.getIdPostulacion()), null);
                            }
                            return mapper.toPostulacionResponse(p, null);
                        });
            }


            public Page<PostulacionResponse> listarMisPostulaciones(Pageable pageable) {
                Postulante postulante = obtenerPostulanteAutenticado();
            
                return postRepo.findByPostulanteId(postulante.getIdPostulante(), pageable)
                        .map(item -> enrichPostulacionResponse(item, null));
            }

            public PostulacionResponse obtenerMiPostulacion(Long idPost) {
                Postulacion postulacion = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));

                // Roles internos (ORH/ADMIN/COMITE) pueden ver cualquier postulación sin restricción de propietario
                if (!esRolInterno()) {
                    validarAccesoPropio(postulacion);
                }
                return enrichPostulacionResponse(postulacion, null);
            }
            
            public List<ExpedienteResponse> listarExpediente(Long idPost) {
                Postulacion postulacion = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));

                // Roles internos (COMITE/ORH/ADMIN) pueden ver expedientes de cualquier postulante
                if (!esRolInterno()) {
                    validarAccesoPropio(postulacion);
                }

                return expRepo.findByPostulacionId(idPost).stream()
                        .sorted(Comparator.comparing(
                                ExpedienteVirtual::getFechaCarga,
                                Comparator.nullsLast(Comparator.naturalOrder())
                        ).reversed())
                        .map(item -> mapper.toExpedienteResponse(item, null))
                        .toList();
            }

            /** E18-DEL — DELETE /postulaciones/{idPost}/expediente/{idExp}.
             *  Solo el postulante dueño puede eliminar. Solo si expediente no finalizado y no verificado. */
            @Transactional
            public void eliminarExpediente(Long idPost, Long idExp, HttpServletRequest http) {
                Postulacion post = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));

                validarAccesoPropio(post);

                if (post.getFechaConfirmacionExpediente() != null) {
                    throw new DomainException("El expediente ya fue finalizado y no admite eliminaciones");
                }

                ExpedienteVirtual exp = expRepo.findById(idExp)
                        .orElseThrow(() -> new ResourceNotFoundException("Expediente", idExp));

                if (!exp.getPostulacion().getIdPostulacion().equals(idPost)) {
                    throw new DomainException("El documento no pertenece a esta postulación");
                }

                if (Boolean.TRUE.equals(exp.getVerificado())) {
                    throw new DomainException("El documento ya fue verificado y no puede eliminarse");
                }

                expRepo.deleteById(idExp);
                audit.registrar("EXPEDIENTE", idExp, "ELIMINAR", http);
            }

            /** B3 — Metadata de un expediente individual para streaming por COMITÉ/ORH */
            public ExpedienteResponse obtenerMetaExpediente(Long idPost, Long idExp) {
                ExpedienteVirtual exp = expRepo.findById(idExp)
                        .orElseThrow(() -> new ResourceNotFoundException("Expediente", idExp));
                if (!exp.getPostulacion().getIdPostulacion().equals(idPost)) {
                    throw new ResourceNotFoundException("Expediente", idExp);
                }
                return mapper.toExpedienteResponse(exp, null);
            }

            @Transactional
            public PostulacionResponse finalizarExpediente(Long idPost, HttpServletRequest http) {
                Postulacion postulacion = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));

                validarAccesoPropio(postulacion);

                int totalExpedientes = (int) expRepo.countByPostulacionId(idPost);
                if (totalExpedientes == 0) {
                    throw new DomainException("Debe cargar al menos un documento antes de finalizar el expediente");
                }

                if (postulacion.getFechaConfirmacionExpediente() != null) {
                    return enrichPostulacionResponse(postulacion, "El expediente ya fue finalizado previamente.");
                }

                postulacion.setFechaConfirmacionExpediente(LocalDateTime.now());
                postulacion.setUsuarioConfirmacionExpediente(user());
                postulacion.setUsuarioModificacion(user());

                postRepo.save(postulacion);

                audit.registrar(
                        "POSTULACION",
                        postulacion.getIdPostulacion(),
                        "FINALIZAR_EXPEDIENTE",
                        "EXPEDIENTE_EN_CARGA",
                        "EXPEDIENTE_COMPLETO",
                        http,
                        "totalExpedientes=" + totalExpedientes
                );

                notificacionService.notificarExpedienteCompleto(postulacion, user());

                return enrichPostulacionResponse(
                        postulacion,
                        "Expediente finalizado correctamente. Su postulación quedó lista para validación."
                );
            }
            
            /**
             * Rollback Administrativo — ÚNICA excepción a transiciones unidireccionales (.cursorrules §4).
             * Permite a ADMIN/ORH reiniciar una postulación a REGISTRADO con sustento obligatorio.
             * Resetea también fechaConfirmacionExpediente para permitir nueva carga de expediente.
             */
            @Transactional
            public PostulacionResponse rollbackAdmin(Long idPost, RollbackAdminRequest req, HttpServletRequest http) {
                if (req.getSustento() == null || req.getSustento().isBlank()) {
                    throw new DomainException("El sustento es obligatorio para el rollback administrativo");
                }

                // Solo REGISTRADO es estado destino válido para rollback
                if (!"REGISTRADO".equals(req.getEstadoDestino())) {
                    throw new DomainException("Estado destino no permitido para rollback: " + req.getEstadoDestino());
                }

                Postulacion post = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));

                String estadoAnterior = post.getEstado();

                // Bypass del statechart normal — rollback administrativo es la única excepción permitida
                post.setEstado("REGISTRADO");
                post.setCodigoAnonimo(null);                   // reset E25
                post.setFechaConfirmacionExpediente(null);     // desbloquea nueva carga de expediente
                post.setUsuarioConfirmacionExpediente(null);
                post.setAdmisionRf07(null);               // reset RF-07
                post.setVerificacionRnssc(null);
                post.setVerificacionRegiprec(null);
                post.setFechaVerificacionDl(null);
                post.setObservacionDl(null);
                post.setPuntajeCurricular(null);
                post.setPuntajeTecnica(null);
                post.setPuntajeEntrevista(null);
                post.setPuntajeBonificacion(null);
                post.setPuntajeTotal(null);
                post.setOrdenMerito(null);
                post.setResultado(null);
                post.setUsuarioModificacion(user());
                postRepo.save(post);

                // Auditoría obligatoria — trazabilidad legal LOG_TRANSPARENCIA
                audit.registrar("POSTULACION", post.getIdPostulacion(),
                        "ROLLBACK_ADMIN",
                        estadoAnterior, "REGISTRADO",
                        http,
                        "ROLLBACK_ADMINISTRATIVO | sustento=" + req.getSustento() + " | operador=" + user());

                return mapper.toPostulacionResponse(post,
                        "Rollback administrativo aplicado: " + estadoAnterior + " → REGISTRADO. Sustento registrado.");
            }

            private String sha256(byte[] data) {
                try {
                    MessageDigest md = MessageDigest.getInstance("SHA-256");
                    byte[] hash = md.digest(data);
                    StringBuilder sb = new StringBuilder();
                    for (byte b : hash) sb.append(String.format("%02x", b));
                    return sb.toString();
                } catch (Exception e) { throw new DomainException("Error calculando SHA-256"); }
    }
}
