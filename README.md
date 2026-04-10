# Convocatorias (SISCONV-ACFFAA)

Monorepo del **Sistema de Convocatorias CAS** para la gestión del ciclo de vida de convocatorias públicas: requerimiento de plaza, convocatoria, postulación, expediente virtual, selección (evaluación curricular y técnica, entrevista), notificaciones, transparencia y contratación.

Stack principal: **Java 21**, **Spring Boot 3.3**, **Oracle** (esquema `SISCONV`), **Angular 19** (standalone, lazy loading, Signals).

---

## Arquitectura backend (cuatro capas)

El backend en `backend/` sigue **arquitectura limpia** con flujo de dependencias hacia el dominio:

| Capa | Paquete | Responsabilidad |
|------|---------|-----------------|
| **Domain** | `pe.gob.acffaa.sisconv.domain` | Entidades JPA, enums, contratos de repositorio (`I*Repository`) |
| **Application** | `pe.gob.acffaa.sisconv.application` | Casos de uso (servicios), DTOs request/response, mappers |
| **Infrastructure** | `pe.gob.acffaa.sisconv.infrastructure` | Adaptadores JPA, seguridad (JWT, usuarios), configuración (`config`), auditoría |
| **Presentation** | `pe.gob.acffaa.sisconv.presentation` | Controllers REST, filtros (`JwtAuthenticationFilter`), manejo global de excepciones |



- **Persistencia:** Spring Data JPA, dialecto Oracle, `ddl-auto: none` (modelo gobernado por scripts versionados, no por Hibernate auto-ddl).
- **Seguridad:** sesión **stateless**, JWT en cabecera `Authorization: Bearer ...`, reglas en `SecurityConfig` y autorización por método (`@PreAuthorize`) en servicios sensibles.
- **Archivos:** documentos y adjuntos fuera de tablas BLOB; ruta base configurable (`STORAGE_PATH` / `app.storage.base-path`).
- **Operaciones asíncronas:** envío de correos vía `@Async` y pool `emailExecutor` (`AsyncConfig`).

---

## Arquitectura frontend

La aplicación en `frontend/` es **Angular 19** modular:

| Área | Ruta base | Propósito |
|------|-----------|-----------|
| **Portal ciudadano** | `/portal/*` | Convocatorias públicas, registro/login de postulante, postulación, expediente, tachas, resultados, examen virtual |
| **Sistema institucional** | `/sistema/*` | Dashboard interno, requerimientos, convocatorias, selección, notificaciones, contratos, administración, banco de preguntas |

- **Lazy loading:** rutas cargan componentes y `loadChildren` bajo demanda (`app.routes.ts` y rutas de features).
- **Estado y auth:** `AuthService` con **Signals**; sesión del usuario en **`sessionStorage`** (clave configurable en `environment`).
- **HTTP:** `apiUrl` apunta a `/api/sisconv`; en desarrollo el **proxy** de Angular redirige a `http://localhost:8080` (`proxy.conf.json`).
- **Interceptor:** adjunta JWT y reintenta con **refresh token** ante `401`.

Alias de paths TypeScript (`tsconfig.json`): `@core/*`, `@shared/*`, `@layouts/*`, `@portal/*`, `@features/*`, `@env/*`.

---

## Flujo de petición (resumen)

1. El navegador llama al backend en **`{origin}/api/sisconv/...`** (mismo path en prod si el reverse proxy unifica host).
2. `JwtAuthenticationFilter` valida el token (si existe) y rellena el `SecurityContext`.
3. El controller delega en el **servicio de aplicación**, que orquesta repositorios y reglas de negocio.
4. Las respuestas JSON siguen el contrato de DTOs; errores pasan por el **manejador global de excepciones**.
5. Acciones relevantes pueden registrarse en **auditoría / log de transparencia** según el caso de uso.


---

## API REST (módulos principales)

Prefijo de aplicación: **`server.servlet.context-path=/api/sisconv`**. Los `@RequestMapping` de controllers son relativos a ese prefijo.

| Prefijo relativo | Módulo |
|------------------|--------|
| `/auth` | Login, registro postulante, refresh, logout |
| `/requerimientos` | Ciclo de requerimiento de plaza |
| `/convocatorias` | Convocatorias, públicos, selección, examen virtual (según subrutas) |
| `/perfiles-puesto` | Perfiles vinculados a convocatoria |
| `/postulaciones`, `/postulantes/...`, `/tachas` | Postulación, expediente, tachas (ver controller) |
| `/notificaciones` | Bandeja y gestión de notificaciones |
| `/contratos` | Contratos |
| `/admin/usuarios`, `/admin/areas`, `/admin/logs` | Administración y transparencia |

Documentación interactiva **Swagger / OpenAPI** habilitada solo cuando el backend corre en perfil de desarrollo (sin perfil activo se trata como dev; ver `SecurityConfig`).

---

## Requisitos previos

- **JDK 21**
- **Maven 3.9+**
- **Node.js 20+** (recomendado para Angular 19) y **npm**
- **Oracle Database** accesible (por ejemplo 21c XE con servicio tipo `XEPDB1`), con usuario/esquema acorde al proyecto
- Herramienta cliente SQL o IDE para ejecutar scripts bajo `backend/src/main/resources/db/`

---

## Configuración y variables de entorno

Valores definidos en `backend/src/main/resources/application.yml` (muchas admiten **override por variables de entorno**). Entre las más importantes:

| Variable | Descripción |
|----------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_SERVICE_NAME` | Conexión Oracle |
| `DB_USERNAME`, `DB_PASSWORD` | Credenciales BD |
| `JWT_SECRET` | Clave HMAC para JWT (**obligatorio rotar en producción**) |
| `STORAGE_PATH` | Directorio base para archivos subidos |
| `MAIL_*`, `MAIL_ENABLED`, `MAIL_FROM` | SMTP y envío de correos |
| `PORTAL_BASE_URL` | Base URL del portal en enlaces de notificaciones |
| `SHOW_SQL` | Depuración SQL (`true`/`false`) |

**Correo:** en entornos reales debe usarse un servidor SMTP institucional; no versionar credenciales.

---

## Base de datos

- Esquema Hibernate por defecto: **`SISCONV`** (`spring.jpa.properties.hibernate.default_schema`).
- Los scripts SQL versionados están en **`backend/src/main/resources/db/`** (`V*.sql`). Deben aplicarse según el procedimiento de tu entorno (convención tipo migración; el `pom.xml` no declara Flyway/Liquibase — uso manual o integración en CI/CD del equipo).

---

## Desarrollo local

### 1. Oracle

Crear usuario/esquema y permisos según estándar del equipo, ejecutar scripts `V*.sql` en orden y poblar datos mínimos (roles, usuarios de prueba) según scripts o instructivos internos.

### 2. Backend

Desde `backend/`:

```bash
mvn spring-boot:run
```

Por defecto el servicio escucha en **`http://localhost:8080`** con context path **`/api/sisconv`**.

Salud: **`GET http://localhost:8080/api/sisconv/actuator/health`**

### 3. Frontend

Desde `frontend/`:

```bash
npm install
npm start
```

Por defecto Angular sirve en **`http://localhost:4200`** y el proxy envía `/api/sisconv` al backend en `8080`.

Entornos: `src/environments/environment.ts` (desarrollo) y `environment.prod.ts` (producción). Ambos usan `apiUrl: '/api/sisconv'` — en producción el mismo path debe resolverse hacia el backend detrás del mismo dominio o gateway.

### 4. Cuentas de prueba

Los usuarios y contraseñas de prueba **no deben documentarse en el repositorio**. Solicítalos al equipo o genera hashes conforme a los scripts de datos semilla.

---

## Pruebas

**Backend** (`backend/`):

```bash
mvn test
```

Los tests de integración ligera pueden usar H2 u Oracle según `src/test/resources/application-test.yml`.

**Frontend** (`frontend/`):

```bash
npm test
```

---

## Despliegue

El repositorio **no incluye** `Dockerfile` ni `docker-compose`; el despliegue típico es:

1. **Backend:** `mvn clean package -DskipTests` (ajustar según política CI) → ejecutar el JAR con JDK 21 y variables de entorno de producción (`JWT_SECRET`, BD, SMTP, `STORAGE_PATH`, etc.).
2. **Frontend:** `npm run build:prod` → publicar el contenido generado (p. ej. `frontend/dist/sisconv-frontend/browser`) en servidor web estático o bucket, con **fallback a `index.html`** para rutas SPA.
3. **Reverse proxy (Nginx, OCI LB, etc.):**
   - Servir el frontend en el dominio público.
   - Enrutar **`/api/sisconv`** al origen del Spring Boot (mismo path que `context-path`), con tamaños de cuerpo acordes a subida de archivos (p. ej. 10 MB alineado a `multipart` en `application.yml`).
4. **HTTPS:** habilitar TLS en borde; cabeceras de seguridad ya se configuran en Spring (`SecurityConfig`).

Verificar en producción: timezone `America/Lima`, reloj NTP, backups de Oracle y política sobre el directorio `STORAGE_PATH`.

---


## Licencia y uso

Uso institucional según políticas de la organización propietaria del código. Queda prohibido incluir **secretos** (contraseñas, claves JWT, API keys) en este README o en el control de versiones.
