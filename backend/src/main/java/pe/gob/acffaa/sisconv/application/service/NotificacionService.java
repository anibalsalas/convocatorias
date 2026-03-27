package pe.gob.acffaa.sisconv.application.service;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;
import pe.gob.acffaa.sisconv.domain.model.Notificacion;
import pe.gob.acffaa.sisconv.domain.model.Postulacion;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.INotificacionRepository;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;

/**
 * Servicio transversal de notificaciones internas.
 * Coherente con DLL actual de TBL_NOTIFICACION.
 */
@Service
public class NotificacionService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);

    private final INotificacionRepository notificacionRepo;
    private final IUsuarioRepository usuarioRepo;
    private final JavaMailSender mailSender;
    private final boolean mailEnabled;
    private final String mailFrom;
    private final String portalBaseUrl;

    public NotificacionService(INotificacionRepository notificacionRepo,
                               IUsuarioRepository usuarioRepo,
                               ObjectProvider<JavaMailSender> mailSenderProvider,
                               @Value("${app.notifications.mail.enabled:false}") boolean mailEnabled,
                               @Value("${app.notifications.mail.from:no-reply@sisconv.gob.pe}") String mailFrom,
                               @Value("${app.notifications.mail.portal-base-url:http://localhost:4200/portal}") String portalBaseUrl) {
        this.notificacionRepo = notificacionRepo;
        this.usuarioRepo = usuarioRepo;
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.mailEnabled = mailEnabled;
        this.mailFrom = mailFrom;
        this.portalBaseUrl = portalBaseUrl;
    }

    public void notificarRol(String codigoRol, String asunto, String contenido, String usuarioCreacion) {
        notificarRoles(List.of(codigoRol), null, asunto, contenido, usuarioCreacion);
    }

    public void notificarRol(String codigoRol, Convocatoria convocatoria,
                             String asunto, String contenido, String usuarioCreacion) {
        notificarRoles(List.of(codigoRol), convocatoria, asunto, contenido, usuarioCreacion);
    }

    /** Overload con tipoNotificacion explícito — usado para tipos específicos como CODIGOS_LISTOS */
    public void notificarRolConTipo(String codigoRol, Convocatoria convocatoria, String tipoNotificacion,
                                    String asunto, String contenido, String usuarioCreacion) {
        List<Usuario> destinatarios = usuariosActivosPorRoles(List.of(codigoRol));
        if (destinatarios.isEmpty()) {
            log.warn("[notificarRolConTipo] No se encontraron usuarios activos con rol '{}'. " +
                    "Notificación tipo '{}' no enviada para convocatoria {}.",
                    codigoRol, tipoNotificacion,
                    convocatoria != null ? convocatoria.getNumeroConvocatoria() : "—");
            return;
        }
        log.info("[notificarRolConTipo] Enviando notificación tipo '{}' a {} usuario(s) con rol '{}'.",
                tipoNotificacion, destinatarios.size(), codigoRol);
        guardarParaUsuariosConTipo(destinatarios, convocatoria, tipoNotificacion, asunto, contenido, usuarioCreacion);
    }

    public void notificarRoles(List<String> codigosRol, String asunto, String contenido, String usuarioCreacion) {
        notificarRoles(codigosRol, null, asunto, contenido, usuarioCreacion);
    }

    public void notificarRoles(List<String> codigosRol, Convocatoria convocatoria,
                               String asunto, String contenido, String usuarioCreacion) {
        guardarParaUsuarios(usuariosActivosPorRoles(codigosRol), convocatoria, asunto, contenido, usuarioCreacion);
    }

    public void notificarUsuario(String username, String asunto, String contenido, String usuarioCreacion) {
        if (username == null || username.isBlank()) {
            return;
        }
        usuarioRepo.findByUsername(username)
                .ifPresent(usuario -> guardarParaUsuarios(List.of(usuario), null, asunto, contenido, usuarioCreacion));
    }

    public void notificarUsuario(String username, Convocatoria convocatoria,
                                 String asunto, String contenido, String usuarioCreacion) {
        if (username == null || username.isBlank()) {
            return;
        }
        usuarioRepo.findByUsername(username)
                .ifPresent(usuario -> guardarParaUsuarios(List.of(usuario), convocatoria, asunto, contenido, usuarioCreacion));
    }

    public void notificarUsuario(Long idUsuario, String asunto, String contenido, String usuarioCreacion) {
        if (idUsuario == null) {
            return;
        }
        usuarioRepo.findById(idUsuario)
                .ifPresent(usuario -> guardarParaUsuarios(List.of(usuario), null, asunto, contenido, usuarioCreacion));
    }

    public void notificarUsuario(Long idUsuario, Convocatoria convocatoria,
                                 String asunto, String contenido, String usuarioCreacion) {
        if (idUsuario == null) {
            return;
        }
        usuarioRepo.findById(idUsuario)
                .ifPresent(usuario -> guardarParaUsuarios(List.of(usuario), convocatoria, asunto, contenido, usuarioCreacion));
    }

    public void notificarPostulacionPendienteExpediente(Postulacion postulacion, String usuarioCreacion) {
        if (postulacion == null || postulacion.getPostulante() == null) {
            return;
        }

        String numeroConvocatoria = postulacion.getConvocatoria() != null
                ? postulacion.getConvocatoria().getNumeroConvocatoria()
                : "—";

        String nombrePuesto = obtenerNombrePuesto(postulacion);

        String asunto = "Postulación registrada: complete su expediente virtual";
        String contenido = "Su postulación a la convocatoria " + numeroConvocatoria
                + " para el puesto " + nombrePuesto
                + " fue registrada correctamente. Debe ingresar a 'Mis Postulaciones' y completar el expediente virtual para continuar en evaluación.";

        Usuario usuarioDestino = resolverUsuarioDestino(postulacion, usuarioCreacion);
        if (usuarioDestino != null) {
            guardarParaUsuarios(List.of(usuarioDestino), postulacion.getConvocatoria(), asunto, contenido, usuarioCreacion);
        }

        enviarCorreoSiCorresponde(
                postulacion.getPostulante().getEmail(),
                asunto,
                construirCuerpoCorreo(numeroConvocatoria, nombrePuesto)
        );
    }

    public void notificarExpedienteCompleto(Postulacion postulacion, String usuarioCreacion) {
        if (postulacion == null || postulacion.getPostulante() == null) {
            return;
        }
    
        String numeroConvocatoria = postulacion.getConvocatoria() != null
                ? postulacion.getConvocatoria().getNumeroConvocatoria()
                : "—";
    
        String nombrePuesto = obtenerNombrePuesto(postulacion);
    
        String asunto = "Expediente virtual completado – postulación registrada";
        String contenido = "Su expediente virtual para la convocatoria " + numeroConvocatoria
                + " del puesto " + nombrePuesto
                + " fue finalizado correctamente. Su postulación quedó lista para validación y filtro de requisitos mínimos.";
    
        Usuario usuarioDestino = resolverUsuarioDestino(postulacion, usuarioCreacion);
        if (usuarioDestino != null) {
            guardarParaUsuarios(List.of(usuarioDestino), postulacion.getConvocatoria(), asunto, contenido, usuarioCreacion);
        }
    
        enviarCorreoSiCorresponde(
                postulacion.getPostulante().getEmail(),
                asunto,
                "Su expediente virtual para la convocatoria " + numeroConvocatoria + " del puesto " + nombrePuesto + " fue finalizado correctamente.\n\n"
                        + "Estado actual:\n"
                        + "- Postulación: REGISTRADO\n"
                        + "- Expediente: COMPLETO\n\n"
                        + "La postulación queda lista para validación y filtro de requisitos mínimos.\n"
                        + "Acceso portal: " + portalBaseUrl + "/postulaciones"
        );
    }

    private List<Usuario> usuariosActivosPorRoles(List<String> codigosRol) {
        if (codigosRol == null || codigosRol.isEmpty()) {
            return List.of();
        }

        return usuarioRepo.findAllActive().stream()
                .filter(usuario -> usuario.getRoles() != null
                        && usuario.getRoles().stream().anyMatch(ur ->
                        "ACTIVO".equals(ur.getEstado())
                                && ur.getRol() != null
                                && codigosRol.contains(ur.getRol().getCodigoRol())))
                .toList();
    }

    private void guardarParaUsuariosConTipo(Collection<Usuario> usuarios, Convocatoria convocatoria,
                                            String tipoNotificacion, String asunto,
                                            String contenido, String usuarioCreacion) {
        if (usuarios == null || usuarios.isEmpty()) return;
        Map<Long, Usuario> unicos = new LinkedHashMap<>();
        usuarios.forEach(u -> { if (u != null && u.getIdUsuario() != null) unicos.putIfAbsent(u.getIdUsuario(), u); });
        LocalDateTime ahora = LocalDateTime.now();
        unicos.values().forEach(usuario -> {
            String titulo = (asunto != null && !asunto.isBlank()) ? asunto : "Notificación del sistema";
            String cuerpo = (contenido != null && !contenido.isBlank()) ? contenido : "Sin detalle";
            notificacionRepo.save(Notificacion.builder()
                    .convocatoria(convocatoria).usuarioDestino(usuario)
                    .tipoNotificacion(tipoNotificacion).titulo(titulo).mensaje(cuerpo)
                    .canal("SISTEMA").leida(false).estado("ENVIADA").fechaEnvio(ahora)
                    .usuarioCreacion(usuarioCreacion).version(0L).fechaCreacion(ahora)
                    .emailDestino(usuario.getEmail()).contenido(cuerpo).asunto(titulo).build());
        });
    }

    private void guardarParaUsuarios(Collection<Usuario> usuarios,
                                     Convocatoria convocatoria,
                                     String asunto,
                                     String contenido,
                                     String usuarioCreacion) {
        if (usuarios == null || usuarios.isEmpty()) {
            return;
        }

        Map<Long, Usuario> unicos = new LinkedHashMap<>();
        usuarios.forEach(usuario -> {
            if (usuario != null && usuario.getIdUsuario() != null) {
                unicos.putIfAbsent(usuario.getIdUsuario(), usuario);
            }
        });

        LocalDateTime ahora = LocalDateTime.now();

        unicos.values().forEach(usuario -> {
            String tituloFinal = (asunto != null && !asunto.isBlank())
                    ? asunto
                    : "Notificación del sistema";

            String contenidoFinal = (contenido != null && !contenido.isBlank())
                    ? contenido
                    : "Sin detalle";

            Notificacion notificacion = Notificacion.builder()
                    .convocatoria(convocatoria)
                    .usuarioDestino(usuario)
                    .tipoNotificacion("SISTEMA")
                    .titulo(tituloFinal)
                    .mensaje(contenidoFinal)
                    .canal("SISTEMA")
                    .leida(false)
                    .estado("ENVIADA")
                    .fechaEnvio(ahora)
                    .usuarioCreacion(usuarioCreacion)
                    .version(0L)
                    .fechaCreacion(ahora)
                    .emailDestino(usuario.getEmail())
                    .contenido(contenidoFinal)
                    .asunto(tituloFinal)
                    .build();

            notificacionRepo.save(notificacion);
        });
    }

    private Usuario resolverUsuarioDestino(Postulacion postulacion, String usuarioCreacion) {
        if (postulacion.getPostulante() != null && postulacion.getPostulante().getUsuario() != null) {
            return postulacion.getPostulante().getUsuario();
        }

        if (usuarioCreacion == null || usuarioCreacion.isBlank()) {
            return null;
        }

        return usuarioRepo.findByUsername(usuarioCreacion).orElse(null);
    }

    private String obtenerNombrePuesto(Postulacion postulacion) {
        if (postulacion.getPerfilPuesto() != null) {
            return postulacion.getPerfilPuesto().getDenominacionPuesto();
        }

        if (postulacion.getConvocatoria() != null
                && postulacion.getConvocatoria().getRequerimiento() != null
                && postulacion.getConvocatoria().getRequerimiento().getPerfilPuesto() != null) {
            return postulacion.getConvocatoria().getRequerimiento().getPerfilPuesto().getDenominacionPuesto();
        }

        return "—";
    }

    private String construirCuerpoCorreo(String numeroConvocatoria, String nombrePuesto) {
        return "Su postulación a la convocatoria " + numeroConvocatoria + " para el puesto " + nombrePuesto + " fue registrada correctamente.\n\n"
                + "Estado actual:\n"
                + "- Postulación: REGISTRADO\n"
                + "- Expediente: PENDIENTE DE CARGA\n\n"
                + "Ingrese a 'Mis Postulaciones' y seleccione 'Completar expediente ahora'.\n"
                + "Acceso portal: " + portalBaseUrl + "/postulaciones";
    }

    // ── E31 — Notificación masiva al publicar resultados ─────────────────────────

    /**
     * Phase 1 (sync, REQUIRED TX): persiste una notificación estado=PENDIENTE por cada postulante.
     * Se ejecuta dentro de la misma transacción de publicarResultados().
     * La publicación es irreversible aunque el SMTP esté caído.
     */
    @Transactional
    public int encolarNotificacionesMasivas(Convocatoria conv, List<Postulacion> postulaciones, String usuarioCreacion) {
        int encoladas = 0;
        LocalDateTime ahora = LocalDateTime.now();
        for (Postulacion p : postulaciones) {
            if (p.getPostulante() == null) continue;
            String email = p.getPostulante().getEmail();
            if (email == null || email.isBlank()) continue;

            String resultado = p.getResultado() != null ? p.getResultado() : p.getEstado();
            String asunto = "Resultados proceso CAS — " + conv.getNumeroConvocatoria();
            String contenido = construirMensajeResultado(conv.getNumeroConvocatoria(), resultado, p.getOrdenMerito());

            Usuario usuarioDestino = null;
            if (p.getPostulante().getUsuario() != null) {
                usuarioDestino = p.getPostulante().getUsuario();
            }

            Notificacion notif = Notificacion.builder()
                    .convocatoria(conv)
                    .usuarioDestino(usuarioDestino)
                    .tipoNotificacion("RESULTADO")
                    .titulo(asunto)
                    .mensaje(contenido)
                    .canal("EMAIL")
                    .leida(false)
                    .estado("PENDIENTE")
                    .fechaEnvio(ahora)
                    .emailDestino(email)
                    .contenido(contenido)
                    .asunto(asunto)
                    .usuarioCreacion(usuarioCreacion)
                    .version(0L)
                    .fechaCreacion(ahora)
                    .build();
            notificacionRepo.save(notif);
            encoladas++;
        }
        log.info("[E31] {} notificaciones encoladas para convocatoria {}", encoladas, conv.getNumeroConvocatoria());
        return encoladas;
    }

    /**
     * Phase 2 (async, "emailExecutor"): lee las notificaciones PENDIENTE de la convocatoria,
     * envía el correo y actualiza el estado a ENVIADO o FALLIDO.
     * Se llama DESPUÉS de que la TX de Phase 1 haya sido confirmada (llamada desde el controller).
     */
    @Async("emailExecutor")
    public void procesarEnvioAsincrono(Long idConvocatoria) {
        List<Notificacion> pendientes = notificacionRepo.findByConvocatoriaIdAndEstado(idConvocatoria, "PENDIENTE");
        log.info("[E31-ASYNC] Procesando {} notificaciones PENDIENTE para conv {}", pendientes.size(), idConvocatoria);
        for (Notificacion n : pendientes) {
            String nuevoEstado;
            try {
                enviarCorreoInterno(n.getEmailDestino(), n.getAsunto(), n.getContenido());
                nuevoEstado = "ENVIADO";
            } catch (Exception ex) {
                log.warn("[E31-ASYNC] Fallo al enviar correo a {}: {}", n.getEmailDestino(), ex.getMessage());
                nuevoEstado = "FALLIDO";
            }
            n.setEstado(nuevoEstado);
            n.setFechaEnvio(LocalDateTime.now());
            notificacionRepo.save(n);
        }
        log.info("[E31-ASYNC] Envío asíncrono completado para conv {}", idConvocatoria);
    }

    private String construirMensajeResultado(String numeroConv, String resultado, Integer ordenMerito) {
        String detalle = switch (resultado) {
            case "GANADOR" -> "Ha sido seleccionado como GANADOR. Se le notificará para la suscripción del contrato CAS.";
            case "ACCESITARIO" -> "Se encuentra en lista de reserva (orden " + ordenMerito + "). Será convocado si el ganador no suscribe el contrato.";
            default -> "El proceso de selección ha concluido. Gracias por su participación.";
        };
        return "Estimado postulante,\n\n"
                + "Los resultados del proceso CAS de la convocatoria " + numeroConv + " han sido publicados.\n\n"
                + detalle + "\n\n"
                + "Puede consultar el detalle en: " + portalBaseUrl + "/mis-resultados\n\n"
                + "ACFFAA — Sistema de Convocatorias CAS";
    }

    private void enviarCorreoInterno(String emailDestino, String asunto, String contenido) {
        if (!mailEnabled || mailSender == null || emailDestino == null || emailDestino.isBlank()) {
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(emailDestino);
        message.setSubject(asunto);
        message.setText(contenido);
        mailSender.send(message);
    }

    private void enviarCorreoSiCorresponde(String emailDestino, String asunto, String contenido) {
        if (!mailEnabled || mailSender == null || emailDestino == null || emailDestino.isBlank()) {
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(emailDestino);
            message.setSubject(asunto);
            message.setText(contenido);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("No se pudo enviar correo de notificación al postulante: {}", ex.getMessage());
        }
    }
}
