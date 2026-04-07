package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria;
import pe.gob.acffaa.sisconv.domain.model.Convocatoria;
import pe.gob.acffaa.sisconv.domain.model.Notificacion;

import java.time.LocalDate;
import java.util.List;

public interface JpaConvocatoriaRepository extends JpaRepository<Convocatoria, Long> {
    Page<Convocatoria> findByEstado(EstadoConvocatoria estado, Pageable pageable);
    Page<Convocatoria> findByEstadoIn(List<EstadoConvocatoria> estados, Pageable pageable);
    Page<Convocatoria> findByEstadoInAndAnio(List<EstadoConvocatoria> estados, Integer anio, Pageable pageable);

    @Query("SELECT c FROM Convocatoria c LEFT JOIN FETCH c.requerimiento r LEFT JOIN FETCH r.perfilPuesto WHERE c.estado IN :estados")
    Page<Convocatoria> findByEstadoInWithPerfil(@Param("estados") List<EstadoConvocatoria> estados, Pageable pageable);

    @Query("SELECT c FROM Convocatoria c LEFT JOIN FETCH c.requerimiento r LEFT JOIN FETCH r.perfilPuesto WHERE c.estado IN :estados AND c.anio = :anio")
    Page<Convocatoria> findByEstadoInAndAnioWithPerfil(@Param("estados") List<EstadoConvocatoria> estados, @Param("anio") Integer anio, Pageable pageable);

    Page<Convocatoria> findByEstadoInAndAnioAndFechaIniPostulacionLessThanEqualAndFechaFinPostulacionGreaterThanEqual(
            List<EstadoConvocatoria> estados,
            Integer anio,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Pageable pageable);

    Page<Convocatoria> findByEstadoInAndFechaIniPostulacionLessThanEqualAndFechaFinPostulacionGreaterThanEqual(
            List<EstadoConvocatoria> estados,
            LocalDate fechaInicio,
            LocalDate fechaFin,
            Pageable pageable);

    @Query("SELECT COUNT(c) FROM Convocatoria c WHERE c.anio = :anio")
    long countByAnio(@Param("anio") int anio);

    @Query(value = "SELECT SEQ_NUM_CONVOCATORIA.NEXTVAL FROM DUAL", nativeQuery = true)
    long nextNumeroConvocatoriaSequenceValue();

    boolean existsByRequerimientoIdRequerimiento(Long idRequerimiento);

    @Query("SELECT COUNT(DISTINCT c.idConvocatoria) FROM Convocatoria c " +
           "JOIN Notificacion n ON n.convocatoria = c " +
           "WHERE c.estado = pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria.EN_ELABORACION " +
           "AND n.usuarioDestino.username = :username " +
           "AND n.estado = 'ENVIADA' " +
           "AND n.deletedAt IS NULL")
    long countPendientesComite(@Param("username") String username);

    @Query("SELECT COUNT(c) FROM Convocatoria c " +
           "WHERE c.estado = pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria.EN_ELABORACION " +
           "AND c.notificacionActaEnviada = true")
    long countPendientesPublicar();

    @Query("SELECT c FROM Convocatoria c " +
           "JOIN c.requerimiento r " +
           "WHERE r.idAreaSolicitante = :idArea " +
           "AND c.examenVirtualHabilitado = true " +
           "AND c.estado IN (pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria.EN_ELABORACION, "
           + "pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria.PUBLICADA, "
           + "pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria.EN_SELECCION)")
    List<Convocatoria> findPendientesBancoByArea(@Param("idArea") Long idArea);

    /**
     * V34 Dashboard ORH: examen virtual habilitado, banco completo (>=20), examen aun no publicado/cerrado.
     */
    @Query("SELECT DISTINCT c FROM Convocatoria c " +
           "WHERE c.examenVirtualHabilitado = true " +
           "AND (SELECT COUNT(bp) FROM BancoPregunta bp WHERE bp.convocatoria.idConvocatoria = c.idConvocatoria) >= 20 " +
           "AND NOT EXISTS (SELECT cfg FROM ConfigExamen cfg WHERE cfg.convocatoria.idConvocatoria = c.idConvocatoria " +
           "AND cfg.estado IN ('PUBLICADO', 'CERRADO')) " +
           "ORDER BY c.idConvocatoria DESC")
    List<Convocatoria> findConvocatoriasBancoCargadoPendienteConfigOrh();

    @Query("SELECT DISTINCT c FROM Convocatoria c, ComiteSeleccion cs "
            + "WHERE cs.convocatoria.idConvocatoria = c.idConvocatoria "
            + "AND c.estado = pe.gob.acffaa.sisconv.domain.enums.EstadoConvocatoria.EN_ELABORACION "
            + "AND cs.estado <> 'COMITE_CONFORMADO' "
            + "ORDER BY c.idConvocatoria DESC")
    List<Convocatoria> findConvocatoriasPendienteNotificarComiteOrh();
}