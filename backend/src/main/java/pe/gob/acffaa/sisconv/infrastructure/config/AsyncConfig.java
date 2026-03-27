package pe.gob.acffaa.sisconv.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import java.util.concurrent.Executor;

/**
 * Habilita @Async y configura el pool "emailExecutor" para envío masivo E31.
 * El pool es pequeño (2-5 hilos) — suficiente para notificaciones CAS que no superan cientos de postulantes.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "emailExecutor")
    public Executor emailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("email-async-");
        executor.initialize();
        return executor;
    }
}
