package pe.gob.acffaa.sisconv.domain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.gob.acffaa.sisconv.domain.model.Postulacion;

import java.util.List;
import java.util.Optional;

public interface IPostulacionRepository {
    Postulacion save(Postulacion p);
    Optional<Postulacion> findById(Long id);
    Optional<Postulacion> findByConvocatoriaIdAndPostulanteId(Long idConv, Long idPost);
    List<Postulacion> findByConvocatoriaId(Long idConv);
    List<Postulacion> findByConvocatoriaIdAndEstado(Long idConv, String estado);
    Page<Postulacion> findByConvocatoriaId(Long idConv, Pageable pageable);
    Page<Postulacion> findByPostulanteId(Long idPostulante, Pageable pageable);
    long countByConvocatoriaId(Long idConv);
    long countByConvocatoriaIdAndEstado(Long idConv, String estado);
    boolean existsByConvocatoriaIdAndEstadoIn(Long idConv, java.util.List<String> estados);
    List<Postulacion> findByConvocatoriaIdAndEstadoIn(Long idConv, java.util.List<String> estados);

    List<Postulacion> findAptosByConvocatoriaWithPostulante(Long idConv);
}