package pe.gob.acffaa.sisconv.infrastructure.persistence;

import org.springframework.stereotype.Repository;
import pe.gob.acffaa.sisconv.domain.model.Postulante;
import pe.gob.acffaa.sisconv.domain.repository.IPostulanteRepository;
import java.util.*;

@Repository
public class PostulanteRepositoryAdapter implements IPostulanteRepository {
    private final JpaPostulanteRepository jpa;
    public PostulanteRepositoryAdapter(JpaPostulanteRepository j){this.jpa=j;}
    @Override public Postulante save(Postulante p){return jpa.save(p);}
    @Override public Optional<Postulante> findById(Long id){return jpa.findById(id);}
    @Override public Optional<Postulante> findByTipoDocumentoAndNumeroDocumento(String t,String n){return jpa.findByTipoDocumentoAndNumeroDocumento(t,n);}
    @Override public Optional<Postulante> findByUsuario_IdUsuario(Long idUsuario){return jpa.findByUsuario_IdUsuario(idUsuario);}
    @Override public List<Postulante> findAll(){return jpa.findAll();}
}
