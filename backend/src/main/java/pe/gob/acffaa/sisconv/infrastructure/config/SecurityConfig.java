package pe.gob.acffaa.sisconv.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;
import pe.gob.acffaa.sisconv.presentation.filter.JwtAuthenticationFilter;

import java.util.Arrays;

/**
 * Configuración de seguridad — SAD §5.1, §5.2, §9.1
 * SAD §3.2: infrastructure/config/ — configuración Spring Security
 * AF §9 RNF-03: JWT stateless + BCrypt 12 + RBAC
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // SAD §5.2: @PreAuthorize en cada endpoint
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final Environment env;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter, Environment env) {
        this.jwtFilter = jwtFilter;
        this.env = env;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        boolean isDev = Arrays.asList(env.getActiveProfiles()).contains("dev")
                     || env.getActiveProfiles().length == 0; // sin perfil = dev

        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // ── M3: Headers de seguridad (NTP-ISO 27001, RM 004-2016-PCM) ──
            .headers(headers -> headers
                .frameOptions(fo -> fo.deny())
                .contentTypeOptions(cto -> {})
                .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
            )
            .authorizeHttpRequests(auth -> {
                auth
                    .requestMatchers("/auth/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/convocatorias/publicas/**").permitAll()
                    .requestMatchers("/actuator/health").permitAll();
                // C5: Swagger solo accesible en perfil dev
                if (isDev) {
                    auth.requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll();
                }
                auth
                    .requestMatchers("/admin/usuarios/**").hasRole("ADMIN")
                    .requestMatchers("/admin/logs/**").hasRole("ADMIN")
                    .requestMatchers("/postulantes/**").hasRole("POSTULANTE")
                    .requestMatchers(HttpMethod.GET, "/catalogos/**").authenticated()
                    .anyRequest().authenticated();
            })
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /** SAD §9.1 Capa 2: BCrypt strength 12 */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
