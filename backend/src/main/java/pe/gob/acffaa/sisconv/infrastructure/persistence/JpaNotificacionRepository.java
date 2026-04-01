package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.model.Notificacion;

public interface JpaNotificacionRepository extends JpaRepository<Notificacion, Long> {
    Page<Notificacion> findByUsuarioDestinoIdUsuario(Long idUsuario, Pageable pageable);
    Page<Notificacion> findByUsuarioDestinoIdUsuarioAndEstado(Long idUsuario, String estado, Pageable pageable);
    java.util.List<Notificacion> findByConvocatoria_IdConvocatoriaAndEstado(Long idConvocatoria, String estado);

    @Query("SELECT n FROM Notificacion n " +
           "JOIN n.usuarioDestino u " +
           "JOIN u.roles ur " +
           "WHERE n.convocatoria.idConvocatoria = :idConvocatoria " +
           "AND n.estado = 'ENVIADA' " +
           "AND ur.rol.codigoRol = :codigoRol " +
           "AND n.deletedAt IS NULL")
    java.util.List<Notificacion> findEnviadasByConvocatoriaYRol(
            @Param("idConvocatoria") Long idConvocatoria,
            @Param("codigoRol") String codigoRol);
}
