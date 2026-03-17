package pe.gob.acffaa.sisconv.infrastructure.config;

import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.*;
import io.swagger.v3.oas.models.security.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger/OpenAPI 3.0 — SAD §4.1: SpringDoc OpenAPI 3
 * Acceso: http://localhost:8080/api/sisconv/swagger-ui.html
 **/
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI sisconvOpenAPI() {
        final String scheme = "bearerAuth";
        return new OpenAPI()
            .info(new Info()
                .title("SISCONV-ACFFAA API")
                .description("API REST del Sistema de Convocatorias CAS\n"
                    + "Agencia de Compras de las Fuerzas Armadas del Per\u00fa\n"
                    + "Normativa: D.S. 075-2008-PCM, D.Leg. 1057, D.L. 1451")
                .version("1.0.0")
                .contact(new Contact().name("OI - ACFFAA").email("oi@acffaa.gob.pe")))
            .addSecurityItem(new SecurityRequirement().addList(scheme))
            .components(new Components().addSecuritySchemes(scheme,
                new SecurityScheme().name(scheme).type(SecurityScheme.Type.HTTP)
                    .scheme("bearer").bearerFormat("JWT")));
    }
}
