.cursorrules

# Política de orquestación por skills y subagentes

## Regla general
Para resolver cualquier error, bug, incidencia o brecha funcional en SISCONV, debes trabajar como un equipo orquestado usando los subagentes disponibles.

### Principio obligatorio
- Primero identifica la naturaleza real del problema.
- Luego prioriza la resolución por **skill dominante**.
- Después coordina el resto de subagentes como apoyo.
- No uses subagentes de forma decorativa; cada uno debe aportar evidencia útil.
- Si algo ya está correctamente implementado, no lo toques.
- Primero audita, luego diagnostica, luego propone el cambio mínimo.
- No hagas refactor innecesario.
- No toques módulos no relacionados.

## Orquestación obligatoria
Siempre coordina mediante:
- `sisconv-cursor-orchestrator` como coordinador principal

Y luego activa/prioriza los demás según el tipo de problema.

---

## Prioridad por tipo de problema

### 1. Error de frontend Angular / UI / rutas / componentes / tipado TS
Skill dominante:
- `sisconv-frontend-master`

Apoyo obligatorio:
- `sisconv-architect`
- `sisconv-ux-signals`
- `sisconv-qa-automation`

Prioridad:
1. `sisconv-frontend-master`
2. `sisconv-architect`
3. `sisconv-ux-signals`
4. `sisconv-qa-automation`

---

### 2. Error backend Spring Boot / servicios / endpoints / DTOs / mappers / seguridad
Skill dominante:
- `sisconv-backend-engineering`

Apoyo obligatorio:
- `sisconv-architect`
- `sisconv-data-infrastructure`
- `sisconv-qa-automation`

Prioridad:
1. `sisconv-backend-engineering`
2. `sisconv-data-infrastructure`
3. `sisconv-architect`
4. `sisconv-qa-automation`

---

### 3. Error Oracle / SQL / secuencias / PK / FK / scripts / performance de consulta
Skill dominante:
- `sisconv-data-infrastructure`

Apoyo obligatorio:
- `sisconv-backend-engineering`
- `sisconv-architect`
- `sisconv-qa-automation`

Prioridad:
1. `sisconv-data-infrastructure`
2. `sisconv-backend-engineering`
3. `sisconv-architect`
4. `sisconv-qa-automation`

---

### 4. Brecha funcional entre código y documentos (AF, SAD, Prototipo, Diagramas)
Skill dominante:
- `sisconv-architect`

Apoyo obligatorio:
- `sisconv-legal-data`
- `sisconv-legal-auditor`
- `sisconv-backend-engineering`
- `sisconv-frontend-master`

Prioridad:
1. `sisconv-architect`
2. `sisconv-legal-data`
3. `sisconv-legal-auditor`
4. `sisconv-backend-engineering`
5. `sisconv-frontend-master`

---

### 5. Problemas UX/UI de flujo, legibilidad, orden de columnas, consistencia visual
Skill dominante:
- `sisconv-ux-signals`

Apoyo obligatorio:
- `sisconv-frontend-master`
- `sisconv-architect`

Prioridad:
1. `sisconv-ux-signals`
2. `sisconv-frontend-master`
3. `sisconv-architect`

---

### 6. Validación normativa, reglas SERVIR, DS, coherencia legal/documental
Skill dominante:
- `sisconv-legal-data`

Apoyo obligatorio:
- `sisconv-legal-auditor`
- `sisconv-architect`

Prioridad:
1. `sisconv-legal-data`
2. `sisconv-legal-auditor`
3. `sisconv-architect`

---

### 7. Casos de prueba, cobertura, no regresión, validación final
Skill dominante:
- `sisconv-qa-automation`

Apoyo obligatorio:
- el subagente dominante del problema principal
- `sisconv-architect`

Prioridad:
1. `sisconv-qa-automation`
2. subagente principal del problema
3. `sisconv-architect`

---

## Regla de resolución
Para cualquier problema debes seguir este orden:

1. Identificar el tipo de problema
2. Activar al coordinador `sisconv-cursor-orchestrator`
3. Priorizar el subagente con el skill dominante
4. Consultar los subagentes de apoyo estrictamente necesarios
5. Entregar primero:
   - diagnóstico exacto
   - qué ya existe y no debe tocarse
   - causa raíz
   - cambio mínimo requerido
6. No implementar mejoras colaterales sin aprobación
7. Si detectas mejoras fuera del alcance, reportarlas como observaciones separadas

---

## Regla de preservación
- Todo lo implementado y funcional hasta la etapa aprobada actual debe preservarse.
- Si una mejora no es crítica para resolver el problema actual, no debe implementarse.
- Si una mejora es relevante, repórtala aparte y espera aprobación del usuario.

---

## Formato de respuesta obligatorio ante errores o bugs
Siempre responder con esta estructura:

1. Tipo de problema detectado
2. Skill dominante priorizado
3. Subagentes usados y por qué
4. Diagnóstico exacto
5. Qué ya existe y no debe tocarse
6. Causa raíz
7. Cambio mínimo requerido
8. Riesgos de no regresión
9. Esperar aprobación si el cambio excede el alcance mínimo


## Prioridad para validaciones de formularios

Si el problema está relacionado con formularios, controles, fechas, números, montos, mensajes de error, required, readonly, disabled, validaciones cruzadas o validaciones previas al backend, debes priorizar la skill:

- `sisconv-form-validator`

Regla:
No debes validar solo por el tipo visual del control. Debes analizar qué representa funcionalmente el campo y aplicar la validación mínima, correcta e inteligente según su propósito real.