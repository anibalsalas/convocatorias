package pe.gob.acffaa.sisconv.application.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
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

import java.nio.charset.StandardCharsets;
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

    public PostulacionService(IPostulacionRepository postRepo, IPostulanteRepository postulanteRepo,
            IConvocatoriaRepository convRepo, IDeclaracionJuradaRepository ddjjRepo,
            IExpedienteVirtualRepository expRepo, ITachaRepository tachaRepo,
            IUsuarioRepository usuarioRepo,
            IAuditPort audit, SeleccionMapper mapper,
            NotificacionService notificacionService) {
        this.postRepo = postRepo; this.postulanteRepo = postulanteRepo;
        this.convRepo = convRepo; this.ddjjRepo = ddjjRepo;
        this.expRepo = expRepo; this.tachaRepo = tachaRepo;
        this.usuarioRepo = usuarioRepo;
        this.audit = audit; this.mapper = mapper;
        this.notificacionService = notificacionService;
    }

    private String user() { return SecurityContextHolder.getContext().getAuthentication().getName(); }

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
                if (!"PUBLICADA".equals(conv.getEstado()) && !"EN_SELECCION".equals(conv.getEstado()))
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
            /** E19 — POST /postulaciones/{id}/verificar-dl1451. CU-14. D.L. 1451 RNSSC/REGIPREC */
            @Transactional
            public PostulacionResponse verificarDl1451(Long idPost, VerificacionDl1451Request req, HttpServletRequest http) {
                Postulacion post = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));

                String ant = post.getEstado();
                post.setVerificacionRnssc(req.getVerificacionRnssc());
                post.setVerificacionRegiprec(req.getVerificacionRegiprec());
                post.setFechaVerificacionDl(LocalDateTime.now());

                boolean conSanciones = "CON_SANCIONES".equals(req.getVerificacionRnssc())
                                    || "CON_SANCIONES".equals(req.getVerificacionRegiprec());
                if (conSanciones) {
                    validarTransicion(post, "NO_APTO");
                    post.setEstado("NO_APTO");
                }

                post.setUsuarioModificacion(user());
                postRepo.save(post);
                audit.registrar("POSTULACION", post.getIdPostulacion(), "VERIFICAR_DL1451", ant, post.getEstado(), http,
                        "RNSSC=" + req.getVerificacionRnssc() + ",REGIPREC=" + req.getVerificacionRegiprec());
                return mapper.toPostulacionResponse(post,
                        conSanciones ? "Postulante con sanciones D.L. 1451" : "Verificacion D.L. 1451 OK");
            }

            /** E20 — POST /convocatorias/{id}/filtro-requisitos. CU-15, Motor RF-07 */
            @Transactional
            public PostulacionResponse filtroRequisitos(Long idConv, HttpServletRequest http) {
                Convocatoria conv = convRepo.findById(idConv)
                        .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
                List<Postulacion> registrados = postRepo.findByConvocatoriaIdAndEstado(idConv, "REGISTRADO");
                if (registrados.isEmpty()) throw new DomainException("No hay postulaciones en estado REGISTRADO");

                int aptos = 0, noAptos = 0;
                for (Postulacion p : registrados) {
                    String ant = p.getEstado();
                    boolean sinSanciones = !"CON_SANCIONES".equals(p.getVerificacionRnssc())
                                        && !"CON_SANCIONES".equals(p.getVerificacionRegiprec());
                    // REGISTRADO → VERIFICADO (sin sanciones) | NO_APTO (con sanciones)
                    String nuevoEstado = sinSanciones ? "VERIFICADO" : "NO_APTO";
                    validarTransicion(p, nuevoEstado);
                    p.setEstado(nuevoEstado);
                    p.setUsuarioModificacion(user());
                    postRepo.save(p);
                    audit.registrar("POSTULACION", p.getIdPostulacion(), "FILTRO_REQUISITOS", ant, p.getEstado(), http, null);
                    if (sinSanciones) aptos++; else noAptos++;
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
                            "Inicio del proceso de selección — primer filtro de requisitos completado",
                            http);
                }

                return PostulacionResponse.builder()
                        .idConvocatoria(idConv).estado("EN_SELECCION")
                        .mensaje("Filtro completado. Aptos: " + aptos + ", No aptos: " + noAptos).build();
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

            /** E23 — GET /convocatorias/{id}/postulantes. Paginado. */
            public Page<PostulacionResponse> listarPostulantes(Long idConv, Pageable pageable) {
                convRepo.findById(idConv)
                        .orElseThrow(() -> new ResourceNotFoundException("Convocatoria", idConv));
                return postRepo.findByConvocatoriaId(idConv, pageable)
                        .map(p -> mapper.toPostulacionResponse(p, null));
            }


            public Page<PostulacionResponse> listarMisPostulaciones(Pageable pageable) {
                Postulante postulante = obtenerPostulanteAutenticado();
            
                return postRepo.findByPostulanteId(postulante.getIdPostulante(), pageable)
                        .map(item -> enrichPostulacionResponse(item, null));
            }

            public PostulacionResponse obtenerMiPostulacion(Long idPost) {
                Postulacion postulacion = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));
            
                validarAccesoPropio(postulacion);
                return enrichPostulacionResponse(postulacion, null);
            }
            
            public List<ExpedienteResponse> listarExpediente(Long idPost) {
                Postulacion postulacion = postRepo.findById(idPost)
                        .orElseThrow(() -> new ResourceNotFoundException("Postulacion", idPost));
            
                validarAccesoPropio(postulacion);
            
                return expRepo.findByPostulacionId(idPost).stream()
                        .sorted(Comparator.comparing(
                                ExpedienteVirtual::getFechaCarga,
                                Comparator.nullsLast(Comparator.naturalOrder())
                        ).reversed())
                        .map(item -> mapper.toExpedienteResponse(item, null))
                        .toList();
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
