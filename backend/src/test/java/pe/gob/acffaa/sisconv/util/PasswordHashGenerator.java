package pe.gob.acffaa.sisconv.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utilidad para generar hash BCrypt — SOLO para uso en desarrollo/test.
 * NO debe existir en src/main para evitar exponer contraseñas en el artefacto.
 *
 * Ejecución: mvn test -Dtest=PasswordHashGenerator#main
 */
public class PasswordHashGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        String password = args.length > 0 ? args[0] : "CAMBIAR_ESTE_VALOR";
        String hash = encoder.encode(password);
        System.out.println("BCrypt:   " + hash);
        System.out.println("Verify:   " + encoder.matches(password, hash));
    }
}
