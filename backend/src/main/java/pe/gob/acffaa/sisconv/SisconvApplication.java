package pe.gob.acffaa.sisconv;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;

/**
 * SISCONV-ACFFAA v1.0 — Sistema de Convocatorias CAS
 * Agencia de Compras de las Fuerzas Armadas del Perú
 * 
 * Arquitectura: Clean Architecture 4 capas (SAD §3.1)
 * Stack: Java 21 + Spring Boot 3.3 (SAD §4.1)
 * Normativa: D.S. 075-2008-PCM, D.Leg. 1057, D.L. 1451, RPE 065-2020-SERVIR
 */
@SpringBootApplication
@EnableJpaAuditing
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
public class SisconvApplication {
    public static void main(String[] args) {
        SpringApplication.run(SisconvApplication.class, args);
    }
}
