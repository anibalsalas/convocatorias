package pe.gob.acffaa.sisconv.infrastructure.security;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import pe.gob.acffaa.sisconv.domain.model.Usuario;
import pe.gob.acffaa.sisconv.domain.repository.IUsuarioRepository;
import java.util.stream.Collectors;

/**
 * Implementación de UserDetailsService — SAD §3.2: infrastructure/security/
 * Carga usuarios desde domain via IUsuarioRepository (no JPA directo)
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final IUsuarioRepository usuarioRepository;

    public CustomUserDetailsService(IUsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByUsername(username.toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + username));

        if (!"ACTIVO".equals(usuario.getEstado())) {
            throw new UsernameNotFoundException("Usuario inactivo: " + username);
        }

        var authorities = usuario.getRoles().stream()
                .filter(ur -> "ACTIVO".equals(ur.getEstado()))
                .map(ur -> new SimpleGrantedAuthority("ROLE_" + ur.getRol().getCodigoRol()))
                .collect(Collectors.toList());

        return User.builder()
                .username(usuario.getUsername())
                .password(usuario.getContrasenaHash())
                .authorities(authorities)
                .build();
    }
}
