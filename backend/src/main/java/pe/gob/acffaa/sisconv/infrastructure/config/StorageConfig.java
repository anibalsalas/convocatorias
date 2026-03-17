package pe.gob.acffaa.sisconv.infrastructure.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pe.gob.acffaa.sisconv.application.port.IStoragePort;
import pe.gob.acffaa.sisconv.infrastructure.storage.FileSystemStorageAdapter;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class StorageConfig {

    private static final Logger log = LoggerFactory.getLogger(StorageConfig.class);

    @Bean
    IStoragePort storagePort(
            @Value("${app.storage.base-path:${user.dir}/sisconv-uploads}") String basePath
    ) {
        Path resolved = Paths.get(basePath).toAbsolutePath().normalize();
        log.info("Almacenamiento de archivos: {}", resolved);
        return new FileSystemStorageAdapter(resolved.toString());
    }
}
