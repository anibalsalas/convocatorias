package pe.gob.acffaa.sisconv.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utilidad para generar hash BCrypt del usuario admin
 * Ejecución: mvn exec:java -Dexec.mainClass="pe.gob.acffaa.sisconv.util.PasswordHashGenerator"
 */
public class PasswordHashGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
        String password = "Admin@2025";
        String hash = encoder.encode(password);
        System.out.println("Password: " + password);
        System.out.println("BCrypt:   " + hash);
        System.out.println("Verify:   " + encoder.matches(password, hash));
    }
}
