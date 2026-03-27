package pe.gob.acffaa.sisconv.application.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import pe.gob.acffaa.sisconv.domain.model.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Generador de Bases de Convocatoria PDF — E16 CU-11.
 * Formato institucional ACFFAA conforme a CONVOCATORIA_ACFFAA.pdf (versión completa).
 * Usa OpenPDF 1.3.39 (pom.xml).
 *
 * Estructura del documento:
 *   Página 1-2 : I. Generalidades · II. Perfil del Puesto · III. Características · IV. Condiciones
 *   Página 3+  : BASES DEL PROCESO CAS
 *                I. Evaluación Curricular (instrucciones + criterios de calificación)
 *                II. Evaluación Técnica
 *                III. Entrevista Personal
 *                IV. Bonificaciones
 *                V. Puntaje Final
 *                VI. Resultados del Proceso
 *                VII. Suscripción y Registro
 *                VIII. Situaciones Irregulares
 *                IX. Mecanismos de Impugnación
 *                X. Declaratoria de Desierto / Cancelación
 *                CRONOGRAMA
 *
 * V16/V17: campos dinámicos en condiciones, canal de postulación y dependencia encargada.
 */
public class BasesPdfGenerator {

    // ── Tipografías ──
    private static final Font TITLE_FONT    = new Font(Font.HELVETICA, 14, Font.BOLD);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 11, Font.BOLD);
    private static final Font SECTION_FONT  = new Font(Font.HELVETICA, 11, Font.BOLD);
    private static final Font SUBSEC_FONT   = new Font(Font.HELVETICA, 10, Font.BOLD);
    private static final Font BODY_FONT     = new Font(Font.HELVETICA, 9,  Font.NORMAL);
    private static final Font BODY_BOLD     = new Font(Font.HELVETICA, 9,  Font.BOLD);
    private static final Font SMALL_FONT    = new Font(Font.HELVETICA, 8,  Font.NORMAL);
    private static final Font TABLE_HEADER  = new Font(Font.HELVETICA, 9,  Font.BOLD, Color.WHITE);
    private static final Font TABLE_CELL    = new Font(Font.HELVETICA, 9,  Font.NORMAL);
    private static final Font TABLE_BOLD    = new Font(Font.HELVETICA, 9,  Font.BOLD);

    // ── Colores ──
    private static final Color HEADER_BG  = new Color(31, 33, 51);
    private static final Color LIGHT_BG   = new Color(245, 245, 245);
    private static final Color SUBHDR_BG  = new Color(200, 210, 230);

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // ── Punto de entrada ────────────────────────────────────────────────────────

    public byte[] generar(Convocatoria conv, PerfilPuesto perfil,
                          List<Cronograma> cronograma, List<FactorEvaluacion> factores) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Margen superior 85pt: 45pt header + 40pt separación al contenido
            Document doc = new Document(PageSize.A4, 50, 50, 85, 50);
            PdfWriter writer = PdfWriter.getInstance(doc, baos);
            writer.setPageEvent(new PageHeaderEvent());
            doc.open();

            // ── Parte 1: Convocatoria ──
            agregarCabecera(doc, conv);
            agregarPerfilPuesto(doc, perfil, conv);
            agregarFunciones(doc, perfil);
            agregarCondiciones(doc, perfil);

            // ── Parte 2: Bases del Proceso ──
            doc.newPage();
            agregarEncabezadoBases(doc);
            agregarEvalCurricular(doc, conv);
            agregarEvaluacionTecnica(doc, conv, factores);
            agregarEntrevistaPersonal(doc, conv, factores);
            agregarBonificaciones(doc);
            agregarPuntajeFinal(doc, conv, factores);
            agregarResultadosProceso(doc);
            agregarSuscripcionContrato(doc);
            agregarSituacionesIrregulares(doc);
            agregarMecanismosImpugnacion(doc);
            agregarDeclaratoriaDesierto(doc);
            agregarCronograma(doc, cronograma);
            agregarPie(doc, conv);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando bases PDF: " + e.getMessage(), e);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PARTE 1 — CONVOCATORIA
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Título de la convocatoria (página 1).
     * Los datos de institución/OGA ya van en PageHeaderEvent en TODAS las páginas.
     */
    private void agregarCabecera(Document doc, Convocatoria conv) throws DocumentException {
        Paragraph titulo = new Paragraph();
        titulo.setAlignment(Element.ALIGN_CENTER);
        titulo.add(new Chunk("PROCESO " + conv.getNumeroConvocatoria() + " - ACFFAA", TITLE_FONT));
        titulo.add(Chunk.NEWLINE);
        titulo.add(Chunk.NEWLINE);
        titulo.add(new Chunk("CONVOCATORIA PARA LA CONTRATACIÓN ADMINISTRATIVA", SUBTITLE_FONT));
        titulo.add(Chunk.NEWLINE);
        titulo.add(new Chunk("DE SERVICIOS", SUBTITLE_FONT));
        doc.add(titulo);
        doc.add(espaciado());
    }

    /** I. GENERALIDADES + II. PERFIL DEL PUESTO */
    private void agregarPerfilPuesto(Document doc, PerfilPuesto perfil,
                                     Convocatoria conv) throws DocumentException {
        doc.add(seccion("I. GENERALIDADES"));

        doc.add(subparrafo("1. Objeto de la convocatoria"));
        String objeto = noBlanco(conv.getObjetoContratacion(),
                "Contratar los servicios para el puesto de " + perfil.getDenominacionPuesto() + ".");
        doc.add(cuerpo(objeto));

        doc.add(subparrafo("2. Dependencia, unidad orgánica y/o área solicitante"));
        doc.add(cuerpo(valOrDash(perfil.getUnidadOrganica())));

        doc.add(subparrafo("3. Dependencia encargada de realizar el proceso de contratación"));
        doc.add(cuerpo(noBlanco(conv.getDependenciaEncargadaProceso(),
                "Oficina General de Administración.")));

        doc.add(subparrafo("4. Base legal"));
        doc.add(cuerpo("a. Ley 29849, Ley que establece la eliminación progresiva del Régimen Especial"
                + " del Decreto Legislativo 1057 y otorga derechos laborales."));
        doc.add(cuerpo("b. Decreto Legislativo N° 1057, que regula el Régimen Especial de Contratación"
                + " Administrativa de Servicios."));
        doc.add(cuerpo("c. Decreto Supremo N° 075-2008-PCM, que aprueba el Reglamento del Decreto"
                + " Legislativo N°1057 que regula el régimen especial de contratación administrativa"
                + " de servicios, modificado por Decreto Supremo N°065-2011-PCM."));
        doc.add(cuerpo("d. Demás disposiciones que regulen el Contrato Administrativo de Servicios."));
        doc.add(espaciado());

        doc.add(seccion("II. PERFIL DEL PUESTO"));
        if (noBlanco(perfil.getMisionPuesto()) != null) {
            doc.add(subparrafo("Misión del Puesto:"));
            doc.add(cuerpo(perfil.getMisionPuesto()));
        }
        PdfPTable tabla = new PdfPTable(2);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{30, 70});
        fila2h(tabla, "REQUISITOS", "DETALLES");
        fila2(tabla, "Experiencia",            obtenerExperiencia(perfil));
        fila2(tabla, "Competencias",           obtenerCompetencias(perfil));
        fila2(tabla, "Formación Académica",    obtenerFormacionAcademica(perfil));
        fila2(tabla, "Cursos / Estudios de Especialización", obtenerCursos(perfil));
        fila2(tabla, "Conocimientos para el Puesto o Cargo", obtenerConocimientos(perfil));
        doc.add(tabla);
        doc.add(espaciado());
    }

    // ── Helpers: construcción de texto para tabla II. PERFIL DEL PUESTO ─────

    /**
     * Experiencia general y específica desde TBL_PERFIL_EXPERIENCIA.
     * tipoExperiencia: "GENERAL" | "ESPECÍFICA"
     */
    private String obtenerExperiencia(PerfilPuesto perfil) {
        List<PerfilExperiencia> lista = perfil.getExperiencias();
        if (lista == null || lista.isEmpty()) return "—";

        String general = lista.stream()
                .filter(e -> "GENERAL".equalsIgnoreCase(e.getTipoExperiencia())
                          && e.getDetalle() != null && !e.getDetalle().isBlank())
                .map(e -> e.getCantidad() + " " + e.getUnidadTiempo().toLowerCase()
                        + " — " + e.getDetalle())
                .collect(Collectors.joining("\n"));

        String especifica = lista.stream()
                .filter(e -> "ESPECÍFICA".equalsIgnoreCase(e.getTipoExperiencia())
                          && e.getDetalle() != null && !e.getDetalle().isBlank())
                .map(e -> e.getCantidad() + " " + e.getUnidadTiempo().toLowerCase()
                        + " — " + e.getDetalle())
                .collect(Collectors.joining("\n"));

        StringBuilder sb = new StringBuilder();
        if (!general.isBlank())   sb.append("- Experiencia general:\n").append(general);
        if (!especifica.isBlank()) {
            if (sb.length() > 0) sb.append("\n");
            sb.append("- Experiencia específica:\n").append(especifica);
        }
        return sb.length() > 0 ? sb.toString() : "—";
    }

    /**
     * Competencias técnicas desde TBL_PERFIL_CONOCIMIENTO (tipoConocimiento = "TÉCNICO").
     * Fallback legal: texto explicativo si no hay datos (defensible ante SERVIR).
     */
    private String obtenerCompetencias(PerfilPuesto perfil) {
        List<PerfilConocimiento> lista = perfil.getConocimientos();
        if (lista == null || lista.isEmpty())
            return "No se especifican competencias adicionales. "
                 + "Evaluación en etapa de Entrevista Personal.";

        String tecnicos = lista.stream()
                .filter(c -> "TÉCNICO".equalsIgnoreCase(c.getTipoConocimiento())
                          && c.getDescripcion() != null && !c.getDescripcion().isBlank())
                .sorted((a, b) -> Integer.compare(
                        a.getOrden() != null ? a.getOrden() : 99,
                        b.getOrden() != null ? b.getOrden() : 99))
                .map(c -> "- " + c.getDescripcion()
                        + (c.getNivelDominio() != null && !"NO_APLICA".equals(c.getNivelDominio())
                                ? " (" + c.getNivelDominio() + ")" : ""))
                .collect(Collectors.joining("\n"));

        return tecnicos.isBlank()
                ? "No se especifican competencias adicionales. "
                  + "Evaluación en etapa de Entrevista Personal."
                : tecnicos;
    }

    /**
     * Formación académica desde TBL_PERFIL_FORMACION_ACADEMICA.
     */
    private String obtenerFormacionAcademica(PerfilPuesto perfil) {
        List<PerfilFormacionAcademica> lista = perfil.getFormacionesAcademicas();
        if (lista == null || lista.isEmpty()) return "—";

        return lista.stream()
                .filter(f -> f.getGradoAcademico() != null && !f.getGradoAcademico().isBlank())
                .sorted((a, b) -> Integer.compare(
                        a.getOrden() != null ? a.getOrden() : 99,
                        b.getOrden() != null ? b.getOrden() : 99))
                .map(f -> {
                    String linea = f.getGradoAcademico();
                    if (f.getEspecialidad() != null && !f.getEspecialidad().isBlank())
                        linea += " en " + f.getEspecialidad();
                    if (Boolean.TRUE.equals(f.getRequiereColegiatura()))
                        linea += " (requiere colegiatura)";
                    if (Boolean.TRUE.equals(f.getRequiereHabilitacionProfesional()))
                        linea += " (requiere habilitación profesional)";
                    return "- " + linea;
                })
                .collect(Collectors.joining("\n"));
    }

    /**
     * Cursos y estudios de especialización desde TBL_PERFIL_CONOCIMIENTO
     * donde tipoConocimiento = "CURSO".
     */
    private String obtenerCursos(PerfilPuesto perfil) {
        List<PerfilConocimiento> lista = perfil.getConocimientos();
        if (lista == null || lista.isEmpty()) return "—";

        String resultado = lista.stream()
                .filter(c -> "CURSO".equalsIgnoreCase(c.getTipoConocimiento())
                          && c.getDescripcion() != null && !c.getDescripcion().isBlank())
                .sorted((a, b) -> Integer.compare(
                        a.getOrden() != null ? a.getOrden() : 99,
                        b.getOrden() != null ? b.getOrden() : 99))
                .map(c -> "- " + c.getDescripcion()
                        + (c.getHoras() != null ? " (" + c.getHoras() + " horas)" : ""))
                .collect(Collectors.joining("\n"));

        return resultado.isBlank() ? "—" : resultado;
    }

    /**
     * Conocimientos para el puesto desde TBL_PERFIL_CONOCIMIENTO
     * donde tipoConocimiento != "CURSO" y != "TÉCNICO" (OFIMÁTICA, IDIOMA, OTRO).
     */
    private String obtenerConocimientos(PerfilPuesto perfil) {
        List<PerfilConocimiento> lista = perfil.getConocimientos();
        if (lista == null || lista.isEmpty()) return "—";

        String resultado = lista.stream()
                .filter(c -> c.getTipoConocimiento() != null
                          && !"CURSO".equalsIgnoreCase(c.getTipoConocimiento())
                          && !"TÉCNICO".equalsIgnoreCase(c.getTipoConocimiento())
                          && c.getDescripcion() != null && !c.getDescripcion().isBlank())
                .sorted((a, b) -> Integer.compare(
                        a.getOrden() != null ? a.getOrden() : 99,
                        b.getOrden() != null ? b.getOrden() : 99))
                .map(c -> {
                    String linea = "[" + c.getTipoConocimiento() + "] " + c.getDescripcion();
                    if (c.getNivelDominio() != null && !"NO_APLICA".equals(c.getNivelDominio()))
                        linea += " — " + c.getNivelDominio();
                    return "- " + linea;
                })
                .collect(Collectors.joining("\n"));

        return resultado.isBlank() ? "—" : resultado;
    }

    /** III. CARACTERÍSTICAS DEL PUESTO Y/O CARGO */
    private void agregarFunciones(Document doc, PerfilPuesto perfil) throws DocumentException {
        doc.add(seccion("III. CARACTERÍSTICAS DEL PUESTO Y/O CARGO"));
        doc.add(subparrafo("Principales funciones a desarrollar:"));
        List<FuncionPuesto> funciones = perfil.getFunciones();
        if (funciones != null && !funciones.isEmpty()) {
            char letra = 'a';
            for (FuncionPuesto f : funciones) {
                doc.add(cuerpo(letra + ") " + f.getDescripcionFuncion()));
                letra++;
            }
        } else {
            doc.add(cuerpo("Según términos de referencia del requerimiento."));
        }
        doc.add(espaciado());
    }

    /** IV. CONDICIONES ESENCIALES DEL CONTRATO */
    private void agregarCondiciones(Document doc, PerfilPuesto perfil) throws DocumentException {
        doc.add(seccion("IV. CONDICIONES ESENCIALES DEL CONTRATO"));
        PdfPTable tabla = new PdfPTable(2);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{40, 60});
        fila2h(tabla, "CONDICIONES", "DETALLES");

        CondicionPuesto cond = perfil.getCondicion();

        String lugar = cond != null ? valOrDash(cond.getLugarPrestacion())
                : "Agencia de Compras de las Fuerzas Armadas\nen la Av. Arequipa 310 - Cercado – Lima";
        String horario = (cond != null && cond.getDiasLaborales() != null
                && cond.getHorarioInicio() != null && cond.getHorarioFin() != null)
                ? cond.getDiasLaborales() + " de " + cond.getHorarioInicio()
                  + " a.m. a " + cond.getHorarioFin() + " p.m."
                : "Lunes a viernes de 8:30 a.m. a 5:00 p.m.";
        String duracion = cond != null ? valOrDash(cond.getDuracionContrato()) : "Según requerimiento";
        String remuneracion = (cond != null && cond.getRemuneracionMensual() != null)
                ? "S/ " + cond.getRemuneracionMensual().setScale(2, RoundingMode.HALF_UP).toString()
                : "Según escala institucional";

        fila2(tabla, "Lugar de Prestación de\nServicio y horario de trabajo",
                lugar + "\n" + horario);
        fila2(tabla, "Duración de Contrato",
                "Inicio: " + (cond != null && cond.getTipoInicioContrato() != null
                        ? cond.getTipoInicioContrato().replace("_", " ").toLowerCase()
                        : "desde la suscripción del contrato")
                        + "\nFin: " + duracion);
        fila2(tabla, "Remuneración Mensual",
                remuneracion + "\nIncluyen los montos y afiliaciones de ley, así como toda"
                        + " deducción aplicable al trabajador.");
        if (cond != null && noBlanco(cond.getOtrasCondiciones()) != null) {
            fila2(tabla, "Otras Condiciones", cond.getOtrasCondiciones());
        }
        doc.add(tabla);
        doc.add(espaciado());
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PARTE 2 — BASES DEL PROCESO DE SELECCIÓN CAS
    // ══════════════════════════════════════════════════════════════════════════

    private void agregarEncabezadoBases(Document doc) throws DocumentException {
        Paragraph titulo = new Paragraph("BASES DEL PROCESO DE SELECCIÓN CAS", SECTION_FONT);
        titulo.setAlignment(Element.ALIGN_CENTER);
        doc.add(titulo);
        doc.add(espaciado());
        doc.add(cuerpo(
                "La Agencia de Compras de las Fuerzas Armadas, es un organismo público ejecutor adscrito al "
                + "Ministerio de Defensa, encargado de planificar, organizar y ejecutar el Plan Estratégico de "
                + "Compras del Sector Defensa, así como los procesos de contrataciones de bienes, servicios, "
                + "obras y consultorías a su cargo, en el mercado nacional y extranjero."));
        doc.add(espaciado());
    }

    /**
     * I. EVALUACIÓN CURRICULAR
     * Incluye: instrucciones de postulación (correo, expediente, nomenclatura)
     * y todos los Criterios de Calificación (fijo legal ACFFAA).
     */
    private void agregarEvalCurricular(Document doc, Convocatoria conv) throws DocumentException {
        doc.add(seccion("I. EVALUACIÓN CURRICULAR"));
        doc.add(cuerpoNegrita("Esta etapa TIENE PUNTAJE Y ES DE CARÁCTER ELIMINATORIO."));

        String correo = noBlanco(conv.getCorreoPostulacion(), "convocatorias@acffaa.gob.pe");
        doc.add(espaciado());
        doc.add(cuerpo(
                "El/la postulante descargará los formatos de postulación: Ficha Curricular, Declaraciones "
                + "Juradas y Consentimiento informado de grabación de voz e imagen (publicados en el "
                + "portal web institucional)."));
        doc.add(espaciado());
        doc.add(cuerpo(
                "El/la postulante deberá remitir al correo electrónico " + correo + ", dentro del plazo "
                + "indicado en el cronograma, los documentos que conforman el Expediente de Postulación. "
                + "Dicho expediente tiene carácter de declaración jurada; por lo tanto, el/la postulante es "
                + "responsable de la información presentada y queda sujeto/a a fiscalización posterior por "
                + "parte de la ACFFAA."));
        doc.add(espaciado());
        doc.add(subparrafo("El expediente debe incluir:"));
        doc.add(cuerpo("1. Ficha Curricular (Anexo N.º 5)."));
        doc.add(cuerpo("2. Hoja de Vida (Currículum Vitae documentado)."));
        doc.add(cuerpo("3. Declaración Jurada A y B (Anexo N.º 6)."));
        doc.add(cuerpo("4. Consentimiento informado para grabación y tratamiento de datos (Anexo N.º 7)."));
        doc.add(cuerpo("5. Copia legible del DNI (anverso y reverso)."));
        doc.add(espaciado());
        doc.add(subparrafo("Se deberá tomar en cuenta, lo siguiente:"));

        String tamano = conv.getMaxTamanoArchivoMb() != null
                ? String.valueOf(conv.getMaxTamanoArchivoMb()) : "18";
        String fmtNombre = noBlanco(conv.getFormatoNombreArchivo(),
                "(NUMERO DE CONVOCATORIA CAS) – Apellidos y Nombres del postulante."
                + " Ejemplo: CAS 014-GUERRA PAZ, ANGEL.");
        String fmtAsunto = noBlanco(conv.getFormatoAsuntoPostulacion(),
                "Convocatoria CAS N° XXX - Apellidos y Nombres del postulante."
                + " Ejemplo: Convocatoria CAS 014-GUERRA PAZ, ANGEL.");

        doc.add(bullet("Todos los documentos deben presentarse en un solo archivo PDF legible, "
                + "caso contrario el/la postulante queda DESCALIFICADO/A del proceso de selección CAS."));
        doc.add(bullet("El archivo PDF no debe exceder los " + tamano + " MB."));
        doc.add(bullet("El nombre del archivo deberá estar denominado de la siguiente manera: "
                + fmtNombre));
        doc.add(bullet("El asunto del correo electrónico debe indicar: " + fmtAsunto));
        doc.add(bullet("El/la postulante que no presente su expediente de postulación en la fecha "
                + "establecida y/o no sustente con documentos el cumplimiento de los requisitos "
                + "mínimos señalados en los términos de referencia, excepto el requisito de "
                + "conocimientos será DESCALIFICADO/A."));
        doc.add(bullet("El/la postulante debe presentar las Declaraciones Juradas debidamente "
                + "firmadas (la firma puede ser manuscrita o escaneada o firma digital), caso "
                + "contrario el/la postulante queda DESCALIFICADO/A del proceso de selección CAS."));
        doc.add(espaciado());

        // ── Criterios de Calificación (texto fijo legal) ──
        doc.add(subparrafo("Criterios de Calificación:"));
        doc.add(cuerpo(
                "Se calificarán los Currículum Vitae documentado que cumplan con las indicaciones "
                + "mencionadas anteriormente, considerando los siguientes criterios:"));
        doc.add(espaciado());

        doc.add(subparrafo("Formación Académica:"));
        doc.add(cuerpo(
                "La Unidad Funcional de Recursos Humanos – UF RRHH verifica y evalúa los requisitos de "
                + "formación académica, referido al nivel educativo, grado(s) o situación académica, carrera "
                + "o especialidad, colegiatura y habilitación profesional, según corresponda, solicitados en "
                + "el perfil de puesto."));
        doc.add(cuerpo(
                "Se tomará en consideración que existen títulos reconocidos por Ley o norma expresa que "
                + "tienen el mismo rango que el título universitario para efectos laborales, como los títulos "
                + "emitidos por las escuelas de educación superior pedagógica y escuelas de formación "
                + "artística, entre otros, según corresponda."));
        doc.add(cuerpo(
                "En el caso de grados académicos y títulos profesionales obtenidos en el extranjero, se "
                + "deberá acreditar copia de la Resolución que aprueba la revalidación del grado o título "
                + "profesional otorgada por una universidad peruana autorizada por la Superintendencia "
                + "Nacional de Educación Superior - SUNEDU, o estar registrado en el registro de títulos, "
                + "grados o estudios de posgrado obtenidos en el extranjero, de conformidad a la Directiva "
                + "N° 001-2014-SERVIR/GDCRSC."));
        doc.add(cuerpo(
                "Podrá presentarse copias simples de certificado de secundaria completa, certificado de "
                + "estudios técnicos básicos o profesional técnico, diploma de bachiller, diploma de título o "
                + "resolución que emite la universidad confiriendo el grado académico (de acuerdo con lo "
                + "solicitado en el Perfil de Puesto)."));
        doc.add(espaciado());

        doc.add(subparrafo("Cursos, Programas de Especialización y/o Diplomados:"));
        doc.add(cuerpo(
                "Para la acreditación de cursos y/o programas de especialización y/o diplomados, la UF RRHH "
                + "tendrá en cuenta la presentación de constancias, certificados o diplomas expedidos por el "
                + "centro de estudios y validado por la autoridad competente que acredite lo requerido en el "
                + "perfil de puesto."));
        doc.add(cuerpo(
                "Los cursos y/o programas de especialización y/o diplomados deben haber concluido a la fecha "
                + "de postulación, y cada documento deberá indicar la cantidad de horas y la temática "
                + "requerida en el perfil de puesto."));
        doc.add(cuerpo(
                "Los programas de especialización y/o diplomados deberán tener una duración mínima de "
                + "noventa (90) horas y si son organizados por disposición de un ente rector, se podrá "
                + "considerar como mínimo ochenta (80) horas."));
        doc.add(cuerpo(
                "En caso de que los Diplomados hayan iniciado durante la vigencia de la Ley N° 30220, a "
                + "partir del 10 de julio de 2014 se considerarán estudios de postgrado los diplomados de "
                + "postgrado, con un mínimo de veinticuatro (24) créditos, teniendo en cuenta que cada "
                + "crédito académico equivale a dieciséis (16) horas lectivas."));
        doc.add(espaciado());

        doc.add(subparrafo("Experiencia General:"));
        doc.add(cuerpo(
                "El tiempo de experiencia (general y/o específica) se contabilizará desde la fecha en que "
                + "el/la postulante obtenga la condición de egresado/a. Para validar dicha experiencia, deberá "
                + "presentar la constancia o diploma de egresado/a; caso contrario, se contabilizará desde "
                + "la obtención del grado de bachiller y/o título profesional, según corresponda."));
        doc.add(cuerpo(
                "De acuerdo a lo señalado en la Ley N° 31396, Ley que reconoce las prácticas "
                + "preprofesionales y prácticas profesionales como experiencia laboral y modifica el Decreto "
                + "Legislativo 1401, se considerará como experiencia laboral las prácticas preprofesionales "
                + "no menor de tres meses y las prácticas profesionales por un periodo de hasta un máximo "
                + "de veinticuatro meses."));
        doc.add(cuerpo(
                "Para los casos de SECIGRA, solo el año completo de SECIGRA DERECHO se reconoce como "
                + "tiempo de servicios prestados al Estado, inclusive en los casos que se han realizado "
                + "previo a la fecha de egreso de la formación correspondiente."));
        doc.add(espaciado());

        doc.add(subparrafo("Experiencia específica:"));
        doc.add(cuerpo(
                "Forma parte de la experiencia laboral general, la cual está asociada a la función o materia, "
                + "puesto o cargo y/o al sector público, así como a otros aspectos complementarios "
                + "vinculados a requisitos adicionales exigidos para desempeñarse en el puesto o cargo."));
        doc.add(cuerpo(
                "Para la evaluación de la experiencia (general y/o específica), la UF RRHH considerará "
                + "únicamente los documentos que indiquen fehacientemente el tiempo de experiencia "
                + "solicitado (fecha de inicio y fecha fin), así como el cargo, función o materia "
                + "desarrollada. Los documentos a ser evaluados son: constancias o certificados de trabajo, "
                + "constancias o certificados de prácticas preprofesionales o profesionales, constancias o "
                + "certificados de prestación de servicios, actas o conformidades de prestación de "
                + "servicios, resoluciones de designación y cese."));
        doc.add(cuerpo(
                "Cuando los documentos se superpongan entre uno y otro, total o parcialmente, se "
                + "contabilizará el periodo consecutivo o el de mayor tiempo de servicio, según sea el caso."));
        doc.add(cuerpoNegrita(
                "Nota: Los contratos laborales y Órdenes de Servicio no serán considerados en el "
                + "cómputo de experiencia laboral, pues no acreditan el cumplimiento del plazo de "
                + "contratación."));
        doc.add(espaciado());

        doc.add(bullet("Colegiatura/Habilitación: En caso el perfil del puesto convocado requiera "
                + "colegiatura y/o habilitación profesional vigente al momento de la postulación, esta "
                + "podrá ser acreditada a través del resultado de la búsqueda en el portal institucional del "
                + "Colegio Profesional, donde conste la condición de \"Habilitado\"."));
        doc.add(bullet("Conocimientos para el Puesto: Deberá consignarse al momento de llenar la Ficha "
                + "Curricular y será corroborado en la Evaluación Técnica."));
        doc.add(bullet("Otra información que resulte conveniente: Para el caso de documentos expedidos en "
                + "idioma diferente al castellano, el/la postulante deberá adjuntar la traducción simple de "
                + "los mismos con la indicación y suscripción de quien oficie de traductor."));
        doc.add(bullet("Licenciado de las Fuerzas Armadas: Documento expedido por la autoridad competente "
                + "que acredite su condición de Licenciado de las Fuerzas Armadas, que haya cumplido el "
                + "Servicio Militar, de corresponder."));
        doc.add(bullet("Discapacidad: Documento que acredite discapacidad, de corresponder."));
        doc.add(bullet("Deportista Calificado de Alto Nivel: Documento emitido por la autoridad competente "
                + "que acredite la condición de Deportista Calificado de Alto Nivel, de corresponder. "
                + "La bonificación se asignará conforme al artículo 7 del reglamento de la Ley N° 27674, "
                + "aprobado con Decreto Supremo N° 089-2003-PCM, siempre que el perfil del puesto "
                + "establezca como requisito la condición de deportista y cuando el/la postulante haya "
                + "obtenido nota aprobatoria en la entrevista personal."));
        doc.add(bullet("Bonificación a jóvenes técnicos y profesionales en el sector público: De acuerdo "
                + "a la bonificación especial prevista en el artículo 3 de la Ley Nº 31533."));
        doc.add(espaciado());
        doc.add(cuerpoNegrita(
                "NOTA: El puntaje de Evaluación Curricular es ÚNICO, por lo que el/la postulante deberá "
                + "presentar sólo los documentos requeridos de acuerdo con los requisitos mínimos "
                + "solicitados, no considerándose documentación adicional presentada por el/la postulante."));
        doc.add(espaciado());
    }

    /** II. EVALUACIÓN TÉCNICA — tabla dinámica con pesos/puntajes de la convocatoria */
    private void agregarEvaluacionTecnica(Document doc, Convocatoria conv,
                                          List<FactorEvaluacion> factores) throws DocumentException {
        doc.add(seccion("II. EVALUACIÓN TÉCNICA"));
        doc.add(cuerpoNegrita("Esta etapa TIENE PUNTAJE Y ES DE CARÁCTER ELIMINATORIO."));
        doc.add(espaciado());
        doc.add(cuerpo(
                "En esta etapa se aplicarán pruebas de conocimientos y/o psicotécnicos acordes a la "
                + "naturaleza del puesto requerido, pudiéndose desarrollar de manera presencial o virtual."));
        doc.add(espaciado());

        BigDecimal pesoTec  = conv.getPesoEvalTecnica()  != null ? conv.getPesoEvalTecnica()  : new BigDecimal("30");
        BigDecimal maxTec   = obtenerPuntajeMax(factores, "TECNICA",   pesoTec);
        BigDecimal minTec   = obtenerPuntajeMin(factores, "TECNICA",
                maxTec.multiply(new BigDecimal("0.70")).setScale(2, RoundingMode.HALF_UP));

        PdfPTable tabla = new PdfPTable(4);
        tabla.setWidthPercentage(80);
        tabla.setWidths(new float[]{30, 20, 25, 25});
        fila4h(tabla, "EVALUACION", "PESO", "PUNTAJE MÍNIMO", "PUNTAJE MÁXIMO");
        fila4c(tabla, "Evaluación Técnica", pesoTec.intValue() + "%",
                minTec.toPlainString(), maxTec.toPlainString());
        doc.add(tabla);
        doc.add(espaciado());

        doc.add(cuerpo(
                "La evaluación técnica podrá realizarse en forma presencial o virtual, dicha modalidad "
                + "será precisada en la publicación de los resultados de la evaluación curricular."));
        doc.add(cuerpo(
                "En el caso de que la Evaluación Técnica se realice de forma virtual, esta se efectuará "
                + "mediante plataformas virtuales que permitan la identificación del/al candidato/a."));
        doc.add(cuerpo(
                "Si el/la candidata/a no se presenta a la etapa de Evaluación Técnica en el lugar, la "
                + "fecha y hora señalada, se le considerará como DESCALIFICADO/A del proceso de selección CAS."));
        doc.add(cuerpo(
                "Se considerará el tiempo de tolerancia de cinco (05) minutos a partir del horario "
                + "estipulado para la evaluación técnica, si pasado el tiempo el/la candidata/a no se "
                + "presenta, no podrá participar del examen."));
        doc.add(espaciado());
    }

    /** III. ENTREVISTA PERSONAL — tabla dinámica con pesos/puntajes de la convocatoria */
    private void agregarEntrevistaPersonal(Document doc, Convocatoria conv,
                                           List<FactorEvaluacion> factores) throws DocumentException {
        doc.add(seccion("III. ENTREVISTA PERSONAL"));
        doc.add(cuerpoNegrita("Esta etapa TIENE PUNTAJE Y ES DE CARÁCTER ELIMINATORIO."));
        doc.add(espaciado());
        doc.add(cuerpo(
                "La Entrevista Personal podrá realizarse en forma presencial o virtual. En ambos casos "
                + "el/la candidata/a deberá presentar su Documento de Identidad, con la finalidad de "
                + "evitar fraude o suplantación."));
        doc.add(cuerpo(
                "Estará a cargo del Comité de Selección quienes evaluarán conocimientos, desenvolvimiento, "
                + "actitud, cualidades y competencias del candidato requeridas para el puesto al cual postula."));
        doc.add(espaciado());

        BigDecimal pesoEnt  = conv.getPesoEntrevista()   != null ? conv.getPesoEntrevista()   : new BigDecimal("40");
        BigDecimal maxEnt   = obtenerPuntajeMax(factores, "ENTREVISTA", pesoEnt);
        BigDecimal minEnt   = obtenerPuntajeMin(factores, "ENTREVISTA",
                maxEnt.multiply(new BigDecimal("0.60")).setScale(2, RoundingMode.HALF_UP));

        PdfPTable tabla = new PdfPTable(4);
        tabla.setWidthPercentage(80);
        tabla.setWidths(new float[]{30, 20, 25, 25});
        fila4h(tabla, "EVALUACION", "PESO", "PUNTAJE MÍNIMO", "PUNTAJE MÁXIMO");
        fila4c(tabla, "Entrevista Personal", pesoEnt.intValue() + "%",
                minEnt.toPlainString(), maxEnt.toPlainString());
        doc.add(tabla);
        doc.add(espaciado());

        doc.add(cuerpo(
                "En caso la entrevista personal sea virtual será comunicado en el Portal Institucional y "
                + "se realizará mediante una plataforma virtual de videollamada (Zoom, Google Meet, Skype, "
                + "WhatsApp, Hangouts u otra similar), la cual será definida por la Oficina General de "
                + "Administración y comunicada oportunamente, por ello es necesario que el/la candidata "
                + "tenga acceso a una computadora/laptop, teclado, mouse, cámara, audio y conexión a internet."));
        doc.add(cuerpo(
                "Si el/la candidata/a no se presenta a la Entrevista Personal en el lugar, fecha y hora "
                + "señalada, se le considerará como DESCALIFICADO/A del proceso de selección CAS."));
        doc.add(cuerpo(
                "La entrevista personal se podrá realizar en forma grupal o individual de acuerdo a la "
                + "cantidad de candidatos/as o competencias personales requeridas para el puesto."));
        doc.add(cuerpo(
                "En caso de empate, se programará una nueva entrevista la que será comunicada "
                + "oportunamente a los/as candidatos/as."));
        doc.add(cuerpo(
                "Se considerará el tiempo de tolerancia de cinco (05) minutos a partir del horario "
                + "estipulado para la Entrevista, si pasado el tiempo el/la candidata/a no se presenta, "
                + "no podrá participar en la Entrevista Personal."));
        doc.add(espaciado());
    }

    /** IV. DE LAS BONIFICACIONES — texto legal completo (Leyes 29248, 29973, 27674, 31533) */
    private void agregarBonificaciones(Document doc) throws DocumentException {
        doc.add(seccion("IV. DE LAS BONIFICACIONES"));

        doc.add(cuerpo(
                "a) Bonificación por ser personal licenciado de las Fuerzas Armadas: Se otorgará una "
                + "bonificación del diez por ciento (10%) sobre el puntaje total, siempre que obtenga "
                + "el puntaje mínimo aprobatorio en la última fase del proceso de selección (entrevista), "
                + "y sustente su condición de licenciado."));
        doc.add(espaciado());

        doc.add(cuerpo(
                "b) Bonificación por discapacidad: Se otorgará una bonificación por discapacidad del "
                + "quince por ciento (15%) sobre el puntaje total, siempre que obtenga el puntaje mínimo "
                + "aprobatorio en la última fase del proceso de selección (entrevista), y sustente su "
                + "condición de persona con discapacidad (carné de discapacidad y/o resolución emitida "
                + "por el CONADIS)."));
        doc.add(espaciado());

        doc.add(cuerpo(
                "c) Bonificación por deportista calificado: Conforme con los artículos 2° y 7° del "
                + "Reglamento de la Ley N° 27674, aprobado con Decreto Supremo N° 089-2003-PCM, que "
                + "establece el acceso de Deportistas de Alto Nivel a la Administración Pública. Esta "
                + "bonificación será otorgada siempre que el perfil del puesto en concurso establezca "
                + "como requisito la condición de deportista y cuando el/la postulante haya obtenido el "
                + "puntaje mínimo aprobatorio en la última fase del proceso de selección (entrevista)."));
        doc.add(espaciado());

        doc.add(cuerpo(
                "d) Bonificación a jóvenes técnicos y profesionales en el sector público: De acuerdo a "
                + "la bonificación especial prevista en el artículo 3 de la Ley Nº 31533, se otorgará "
                + "las siguientes bonificaciones:"));
        doc.add(espaciado());

        doc.add(subparrafo("   1. Bonificación en la entrevista personal"));
        doc.add(cuerpo(
                "Se otorgará una bonificación del 10% del puntaje obtenido en la etapa de entrevista "
                + "personal a los postulantes que aprueben dicha etapa y cumplan con las siguientes "
                + "condiciones:"));
        doc.add(cuerpo("      1.1  Ser técnicos o profesionales*."));
        doc.add(cuerpo("      1.2  Tener como máximo veintinueve (29) años de edad al inicio del plazo "
                + "de postulación al presente proceso de selección."));
        doc.add(cuerpoNegrita("   Puntaje de entrevista personal + 10% (del puntaje de entrevista)"));
        doc.add(cuerpo(
                "   Para el otorgamiento de la bonificación, el postulante debe haber obtenido el puntaje "
                + "mínimo aprobatorio en la entrevista personal, acreditar su edad y formación técnica "
                + "o profesional, conforme a las bases del concurso público de méritos."));
        doc.add(cuerpo(
                "   * Profesional: Persona que ha obtenido el grado de bachiller o título profesional "
                + "otorgado por una universidad con acreditación reconocida de acuerdo con lo establecido "
                + "en la Ley Nº 30220, Ley Universitaria; así como aquella que ha obtenido el grado de "
                + "bachiller o título profesional en escuelas de educación superior, de acuerdo con lo "
                + "dispuesto en la Ley Nº 30512."));
        doc.add(espaciado());

        doc.add(subparrafo("   2. Puntos adicionales por experiencia en el sector público:"));
        doc.add(cuerpo(
                "   Los postulantes técnicos o profesionales que tengan como máximo veintinueve (29) años "
                + "al inicio del plazo de postulación y que cuenten con experiencia laboral en el sector "
                + "público, recibirán un incremento porcentual sobre el puntaje final obtenido:"));
        doc.add(cuerpo("      a) Un (1) punto porcentual por un (1) año de experiencia en el sector público."));
        doc.add(cuerpo("      b) Dos (2) puntos porcentuales por dos (2) años de experiencia en el sector público."));
        doc.add(cuerpo("      c) Tres (3) puntos porcentuales por tres (3) años o más de experiencia en el sector público."));
        doc.add(cuerpo(
                "   El incremento porcentual sobre el puntaje final se realiza cuando se haya alcanzado "
                + "el puntaje mínimo aprobatorio en todas las evaluaciones, incluida la bonificación en "
                + "la entrevista personal, conforme a las bases del concurso público."));
        doc.add(cuerpo(
                "   La experiencia laboral en el sector público incluye las prácticas preprofesionales y "
                + "profesionales realizadas en el Estado."));
        doc.add(espaciado());
    }

    /** V. PUNTAJE FINAL — tabla detallada con subcategorías dinámicas */
    private void agregarPuntajeFinal(Document doc, Convocatoria conv,
                                     List<FactorEvaluacion> factores) throws DocumentException {
        doc.add(seccion("V. PUNTAJE FINAL"));
        doc.add(cuerpo(
                "El puntaje final es la sumatoria de los puntajes de la evaluación curricular, evaluación "
                + "técnica y entrevista personal, tomando en cuenta las bonificaciones especiales de "
                + "corresponder, siendo elegido como ganador del concurso, el/la candidata/a que tenga "
                + "el mayor puntaje."));
        doc.add(espaciado());

        BigDecimal pesoCurr = conv.getPesoEvalCurricular() != null ? conv.getPesoEvalCurricular() : new BigDecimal("30");
        BigDecimal pesoTec  = conv.getPesoEvalTecnica()    != null ? conv.getPesoEvalTecnica()    : new BigDecimal("30");
        BigDecimal pesoEnt  = conv.getPesoEntrevista()     != null ? conv.getPesoEntrevista()     : new BigDecimal("40");
        BigDecimal maxTec   = obtenerPuntajeMax(factores, "TECNICA",    pesoTec);
        BigDecimal minTec   = obtenerPuntajeMin(factores, "TECNICA",
                maxTec.multiply(new BigDecimal("0.70")).setScale(2, RoundingMode.HALF_UP));
        BigDecimal maxEnt   = obtenerPuntajeMax(factores, "ENTREVISTA", pesoEnt);
        BigDecimal minEnt   = obtenerPuntajeMin(factores, "ENTREVISTA",
                maxEnt.multiply(new BigDecimal("0.60")).setScale(2, RoundingMode.HALF_UP));

        PdfPTable tabla = new PdfPTable(4);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{10, 40, 25, 25});
        fila4h(tabla, "N°", "Fases", "Puntaje Mínimo", "Puntaje Máximo");

        // Evaluación Curricular — fila principal
        filaResumen(tabla, "1", "Evaluación curricular", pesoCurr.toPlainString(), pesoCurr.toPlainString(), true);

        // Subcategorías curriculares desde factores, o por defecto 3 × 10
        List<FactorEvaluacion> subcurricular = factores.stream()
                .filter(f -> "CURRICULAR".equals(f.getEtapaEvaluacion()) && f.getFactorPadre() != null)
                .sorted((a, b) -> {
                    int oa = a.getOrden() != null ? a.getOrden() : 99;
                    int ob = b.getOrden() != null ? b.getOrden() : 99;
                    return Integer.compare(oa, ob);
                })
                .toList();

        if (!subcurricular.isEmpty()) {
            for (FactorEvaluacion f : subcurricular) {
                filaSubcriterio(tabla, f.getCriterio(),
                        f.getPuntajeMinimo() != null ? f.getPuntajeMinimo().toPlainString() : "—",
                        f.getPuntajeMaximo()  != null ? f.getPuntajeMaximo().toPlainString()  : "—");
            }
        } else {
            filaSubcriterio(tabla, "Formación Académica", "10.00", "10.00");
            filaSubcriterio(tabla, "Experiencia", "10.00", "10.00");
            filaSubcriterio(tabla, "Cursos y/o Especializaciones (*)", "10.00", "10.00");
        }

        filaResumen(tabla, "2", "Evaluación técnica",  minTec.toPlainString(), maxTec.toPlainString(), false);
        filaResumen(tabla, "3", "Entrevista Personal", minEnt.toPlainString(), maxEnt.toPlainString(), false);

        BigDecimal totalMin = pesoCurr.add(minTec).add(minEnt);
        filaTotal(tabla, "Total", "100", totalMin.toPlainString(), "100");
        doc.add(tabla);
        doc.add(espaciado());

        doc.add(cuerpo(
                "(*) En los casos que no se requiera contar con cursos y/o especialización en la evaluación "
                + "curricular, dicho puntaje será asignado a la formación académica."));
        doc.add(cuerpo(
                "El Cuadro de Méritos se elaborará con aquellos/as candidatos/as que fueron convocados a "
                + "la Entrevista Personal, detallando los resultados obtenidos en cada evaluación, en el "
                + "cual se comunicará la condición final obtenida en el proceso."));
        doc.add(espaciado());
    }

    /** VI. RESULTADOS DEL PROCESO */
    private void agregarResultadosProceso(Document doc) throws DocumentException {
        doc.add(seccion("VI. RESULTADOS DEL PROCESO"));
        doc.add(bullet(
                "La OGA-UF RRHH solicita a la OI la publicación de los resultados finales de la Etapa "
                + "de Selección, en el portal web institucional (www.acffaa.gob.pe) en orden de mérito, "
                + "con los puntajes obtenidos en cada fase y señalando al candidato/a que resultó GANADOR/A."));
        doc.add(bullet(
                "El/la candidato/a que haya obtenido la nota mínima aprobatoria y no resulte ganador/a, "
                + "será considerado/a como accesitario/a, de acuerdo al orden de mérito (el inmediato siguiente)."));
        doc.add(bullet(
                "En caso la presentación del expediente de postulación sea en físico no se devolverá la "
                + "documentación entregada por los postulantes calificados, por formar parte del expediente "
                + "del proceso de selección."));
        doc.add(espaciado());
    }

    /** VII. SUSCRIPCIÓN Y REGISTRO DEL CONTRATO — incluye Debida Diligencia */
    private void agregarSuscripcionContrato(Document doc) throws DocumentException {
        doc.add(seccion("VII. SUSCRIPCIÓN Y REGISTRO DEL CONTRATO"));
        doc.add(cuerpo(
                "El/la candidato/a declarado/a como ganador/a en el proceso de selección, para efectos de "
                + "la suscripción y registro del Contrato Administrativo de Servicios, deberá presentarse "
                + "a la OGA – UF RRHH en la fecha señalada en el cronograma, previa coordinación."));
        doc.add(espaciado());

        doc.add(subparrafo("Debida Diligencia"));
        doc.add(cuerpo(
                "La OGA – UF RRHH, previo a la suscripción del Contrato Administrativo de Servicios "
                + "realizará acciones de verificación del/a candidato/a ganador/a en la Plataforma de "
                + "Debida Diligencia del Sector Público (implementada por la Secretaria de Integridad "
                + "Pública - SIP de la Presidencia del Consejo de Ministros - PCM) atendiendo lo siguiente:"));
        doc.add(cuerpo(
                "a) Alerta Roja: Para todos los puestos el/la candidata/a ganador/a no suscribirá contrato "
                + "con la ACFFAA."));
        doc.add(cuerpo(
                "b) Alerta amarilla o ámbar: Si es puesto de sujeto obligado, el/la candidato/a ganador/a "
                + "no suscribirá contrato con la ACFFAA. Si el puesto no es de sujeto obligado se continúa "
                + "con la suscripción del contrato."));
        doc.add(cuerpo(
                "c) Alerta verde: Para todos los casos, el/la candidato/a ganador/a continúa con la "
                + "suscripción del contrato."));
        doc.add(espaciado());
        doc.add(cuerpo(
                "El/la candidata/a ganador/a del proceso de selección CAS y que a la fecha de publicación "
                + "de los resultados finales mantengan vínculo laboral con el Estado, deberá solicitar al "
                + "área de Recursos Humanos de la entidad de origen, la baja en el Aplicativo Informático "
                + "para el Registro Centralizado de Planillas y de Datos de los Recursos Humanos del "
                + "Sector Público (AIRHSP)."));
        doc.add(cuerpo(
                "El/la candidato/a ganador/a que a la fecha de publicación de los resultados finales se "
                + "encuentre percibiendo alguna remuneración por parte del Estado, deberá acreditar con "
                + "documentación el haber suspendido dicho pago."));
        doc.add(cuerpo(
                "El/la candidato/a ganador/a inscrito/a en el Registro de Deudores Alimentarios Morosos - "
                + "REDAM, requiere previo a la suscripción del contrato, realizar las acciones dispuestas "
                + "en la normativa vigente relacionada al referido registro (Ley N° 28970 y Decreto "
                + "Supremo N° 008-2019-JUS)."));
        doc.add(cuerpo(
                "La Oficina General de Administración – Unidad Funcional de Recursos Humanos verificará "
                + "si el candidato/a ganador presenta impedimento, incompatibilidad o prohibición para "
                + "ejercer la función pública, haciendo uso de las siguientes plataformas:"));
        doc.add(bullet("Registro Nacional de Sanciones de Servidores Civiles – RNSSC."));
        doc.add(bullet("Registro de Deudores de Reparaciones Civiles por Delitos Dolosos (REDERECI)."));
        doc.add(bullet("Plataforma de Debida Diligencia de la PCM."));
        doc.add(espaciado());
    }

    /** VIII. SITUACIONES IRREGULARES Y CONSECUENCIAS */
    private void agregarSituacionesIrregulares(Document doc) throws DocumentException {
        doc.add(seccion("VIII. SITUACIONES IRREGULARES Y CONSECUENCIAS"));
        doc.add(bullet(
                "Cualquier controversia, situación no prevista o interpretación a las bases que se "
                + "susciten o se requieran durante el proceso de selección, será resuelto por la Oficina "
                + "General de Administración o por el Comité de Selección, según corresponda."));
        doc.add(bullet(
                "En caso de que el/la candidato/a se presente a las evaluaciones fuera del horario "
                + "establecido para dicho efecto, no podrá participar en las mismas y será "
                + "DESCALIFICADO/A del proceso."));
        doc.add(bullet(
                "Durante el desarrollo de cada una de las etapas de evaluación, el/la candidato/a deberá "
                + "permanecer en el ambiente físico o virtual señalado para las evaluaciones; de lo "
                + "contrario serán automáticamente DESCALIFICADO/A."));
        doc.add(bullet(
                "En caso que el/la candidata/a sea suplantado/a, será automáticamente DESCALIFICADO/A, "
                + "sin perjuicio de las acciones civiles o penales que la entidad adopte."));
        doc.add(bullet(
                "De detectarse que el/la candidato/a haya incurrido en plagio o incumplido lo indicado "
                + "en las Bases, las instrucciones o consideraciones a tomar en cuenta publicadas para el "
                + "desarrollo de cualquiera de las etapas del proceso, será automáticamente "
                + "DESCALIFICADO/A; sin perjuicio de las acciones civiles o penales que la entidad pueda adoptar."));
        doc.add(bullet(
                "El/la postulante y/o candidato/a que mantenga vínculo de cualquier índole con la "
                + "entidad, se someterá a las disposiciones establecidas en las presentes bases del "
                + "proceso participando en iguales condiciones con los demás postulantes y/o candidatos."));
        doc.add(bullet(
                "En caso el/la postulante presentara información inexacta o incumpla con uno o más "
                + "requisitos para su incorporación con carácter de declaración jurada, será "
                + "DESCALIFICADO/A del proceso en cualquiera de las etapas en la cual se encuentre; y si "
                + "luego de haberse adjudicado una posición, se verifica que ha consignado información "
                + "falsa, será cesado, de acuerdo a las normas vigentes, sin perjuicio de la "
                + "responsabilidad penal y/o administrativa en que hubiera incurrido."));
        doc.add(bullet(
                "La Entidad está obligada a brindar información en detalle de los resultados alcanzados "
                + "en las diferentes etapas respecto a los/las postulantes y/o candidatos/as, salvo que "
                + "la misma se refiera a los supuestos de información secreta, reservada o confidencial. "
                + "El acceso a la información estará restringido cuando se requiera información personal "
                + "como la referida al domicilio, el número telefónico o el correo electrónico de los/las "
                + "postulantes, ya que esta información no está vinculada al cumplimiento de los requisitos "
                + "del puesto o cargo al que se postula."));
        doc.add(espaciado());
    }

    /** IX. MECANISMOS DE IMPUGNACIÓN */
    private void agregarMecanismosImpugnacion(Document doc) throws DocumentException {
        doc.add(seccion("IX. MECANISMOS DE IMPUGNACIÓN"));
        doc.add(bullet(
                "Si algún postulante y/o candidato/a considera que la Oficina General de Administración o "
                + "el Comité de Selección ha emitido un acto que supuestamente viole, desconozca o lesione "
                + "un derecho o interés legítimo, podrá presentar ante dicho órgano un recurso de "
                + "reconsideración o apelación para su resolución o traslado al Tribunal del Servicio Civil "
                + "según corresponda."));
        doc.add(bullet(
                "La Oficina General de Administración o el Comité de Selección, según corresponda, debe "
                + "resolver el recurso de reconsideración en un plazo de hasta (15) días hábiles, de presentado."));
        doc.add(bullet(
                "Los recursos de impugnación (reconsideración y apelación), se interponen dentro de los "
                + "quince (15) días hábiles computados desde el día siguiente de la publicación del acto "
                + "definitivo con el que concluye el proceso (publicación del resultado final o lista de "
                + "ganadores) resultando improcedente que se impugnen los resultados preliminares o "
                + "calificaciones obtenidas en alguna de las etapas del proceso o cualquier acto emitido "
                + "antes de la emisión y publicación de los resultados finales del proceso. La "
                + "interposición de los mencionados recursos no suspende el proceso de selección ni el "
                + "proceso de vinculación."));
        doc.add(espaciado());
    }

    /** X. DE LA DECLARATORIA DEL PROCESO COMO DESIERTO O DE LA CANCELACIÓN DEL PROCESO */
    private void agregarDeclaratoriaDesierto(Document doc) throws DocumentException {
        doc.add(seccion("X. DE LA DECLARATORIA DEL PROCESO COMO DESIERTO O DE LA CANCELACIÓN DEL PROCESO"));

        doc.add(subparrafo("A. Declaratoria del Proceso como desierto:"));
        doc.add(cuerpo("El proceso de selección CAS se declara DESIERTO por las siguientes causas:"));
        doc.add(cuerpo("a) Cuando no se presenten postulantes o candidatos/as en alguna de las etapas del proceso de selección."));
        doc.add(cuerpo("b) Cuando no se cuente con postulantes o candidatos/as aprobados/as en alguna etapa del proceso de selección CAS."));
        doc.add(cuerpo("c) Cuando no se presente el/la GANADOR/A a la suscripción del contrato y no haya accesitario/a."));
        doc.add(cuerpo("d) Cuando no se presente el/la accesitario/a a la suscripción del contrato."));
        doc.add(cuerpo("e) Cuando el candidato/a ganador/a no suscribe el contrato CAS."));
        doc.add(cuerpo("f) Cuando el/la candidato/a está impedido/a de prestar servicios en el Estado (RNSSC), o presentar alerta en la Plataforma de Debida Diligencia."));
        doc.add(cuerpo("g) Cuando el candidato/a ganador/a se encuentre inscrito en el Registro de Deudores de Reparaciones Civiles por Delitos Dolosos (REDERECI)."));
        doc.add(cuerpo("h) Cuando el candidato/a ganador no suscribe el compromiso Registro de Deudores Morosos Alimentarios – REDAM."));
        doc.add(espaciado());

        doc.add(subparrafo("B. Cancelación del Proceso de Selección"));
        doc.add(cuerpo("El proceso puede ser cancelado en alguno de los siguientes supuestos, sin que sea responsabilidad de la Agencia de Compras de las Fuerzas Armadas:"));
        doc.add(cuerpo("a) Cuando desaparece la necesidad del servicio de la Agencia de Compras de las Fuerzas Armadas, con posterioridad al inicio del proceso de selección."));
        doc.add(cuerpo("b) Por asuntos restricciones presupuestales."));
        doc.add(cuerpo("c) Otros supuestos debidamente justificados."));
        doc.add(cuerpo("La cancelación del Proceso de Selección será publicada en el portal institucional de la Agencia de Compras de las Fuerzas Armadas https://www.gob.pe/acffaa cuando corresponda."));
        doc.add(espaciado());
    }

    /** CRONOGRAMA Y ETAPAS DEL PROCESO */
    private void agregarCronograma(Document doc, List<Cronograma> cronograma) throws DocumentException {
        Paragraph titulo = new Paragraph("CRONOGRAMA Y ETAPAS DEL PROCESO", SECTION_FONT);
        titulo.setAlignment(Element.ALIGN_CENTER);
        doc.add(titulo);
        doc.add(espaciado());

        if (cronograma == null || cronograma.isEmpty()) {
            doc.add(cuerpo("Cronograma pendiente de registro."));
            doc.add(espaciado());
            return;
        }
        PdfPTable tabla = new PdfPTable(3);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{45, 30, 25});
        fila3h(tabla, "ETAPAS DEL PROCESO", "FECHAS DE DESARROLLO DEL PROCESO", "ÁREAS RESPONSABLE");
        for (Cronograma c : cronograma) {
            String etiqueta = c.getActividad() != null ? c.getActividad() : c.getEtapa();
            String fechas = "";
            if (c.getFechaInicio() != null && c.getFechaFin() != null
                    && !c.getFechaInicio().equals(c.getFechaFin())) {
                fechas = "Del " + c.getFechaInicio().format(FMT) + " al " + c.getFechaFin().format(FMT);
            } else if (c.getFechaInicio() != null) {
                fechas = c.getFechaInicio().format(FMT);
            }
            String areas = joinAreas(c);
            fila3(tabla, etiqueta, fechas, areas);
        }
        doc.add(tabla);
        doc.add(espaciado());
        doc.add(cuerpo(
                "Consideraciones: El cronograma puede estar sujeto a variaciones que se darán a conocer "
                + "oportunamente. En el aviso de publicación de cada etapa, se anunciará la fecha y hora "
                + "de la siguiente actividad. El postulante es responsable de realizar el seguimiento de "
                + "la publicación de los resultados parciales y finales del presente proceso de selección."));
    }

    private void agregarPie(Document doc, Convocatoria conv) throws DocumentException {
        doc.add(espaciado());
        Paragraph pie = new Paragraph();
        pie.setAlignment(Element.ALIGN_CENTER);
        pie.add(new Chunk("Generado por SISCONV-ACFFAA v2.0", SMALL_FONT));
        pie.add(Chunk.NEWLINE);
        pie.add(new Chunk(conv.getNumeroConvocatoria() + " — " + valOrDash(conv.getDescripcion()),
                SMALL_FONT));
        doc.add(pie);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS — Factores de evaluación
    // ══════════════════════════════════════════════════════════════════════════

    private BigDecimal obtenerPuntajeMax(List<FactorEvaluacion> factores, String etapa,
                                         BigDecimal defaultVal) {
        if (factores == null) return defaultVal;
        return factores.stream()
                .filter(f -> etapa.equals(f.getEtapaEvaluacion()) && f.getFactorPadre() == null
                        && f.getPuntajeMaximo() != null)
                .map(FactorEvaluacion::getPuntajeMaximo)
                .findFirst()
                .orElse(defaultVal);
    }

    private BigDecimal obtenerPuntajeMin(List<FactorEvaluacion> factores, String etapa,
                                         BigDecimal defaultVal) {
        if (factores == null) return defaultVal;
        return factores.stream()
                .filter(f -> etapa.equals(f.getEtapaEvaluacion()) && f.getFactorPadre() == null
                        && f.getPuntajeMinimo() != null
                        && f.getPuntajeMinimo().compareTo(BigDecimal.ZERO) > 0)
                .map(FactorEvaluacion::getPuntajeMinimo)
                .findFirst()
                .orElse(defaultVal);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS — Construcción de celdas y párrafos
    // ══════════════════════════════════════════════════════════════════════════

    private Paragraph seccion(String texto) {
        Paragraph p = new Paragraph(texto, SECTION_FONT);
        p.setSpacingBefore(10);
        p.setSpacingAfter(4);
        return p;
    }

    private Paragraph subparrafo(String texto) {
        Paragraph p = new Paragraph(texto, SUBSEC_FONT);
        p.setSpacingBefore(4);
        p.setIndentationLeft(10);
        return p;
    }

    private Paragraph cuerpo(String texto) {
        Paragraph p = new Paragraph(texto, BODY_FONT);
        p.setAlignment(Element.ALIGN_JUSTIFIED);
        p.setIndentationLeft(20);
        p.setSpacingBefore(2);
        p.setSpacingAfter(2);
        return p;
    }

    private Paragraph cuerpoNegrita(String texto) {
        Paragraph p = new Paragraph(texto, BODY_BOLD);
        p.setAlignment(Element.ALIGN_JUSTIFIED);
        p.setIndentationLeft(20);
        p.setSpacingBefore(2);
        p.setSpacingAfter(2);
        return p;
    }

    private Paragraph bullet(String texto) {
        Paragraph p = new Paragraph("\u2022  " + texto, BODY_FONT);
        p.setAlignment(Element.ALIGN_JUSTIFIED);
        p.setIndentationLeft(30);
        p.setFirstLineIndent(-10);
        p.setSpacingBefore(2);
        return p;
    }

    private Paragraph espaciado() {
        return new Paragraph(" ", SMALL_FONT);
    }

    // ── Tablas 2 columnas ──

    private void fila2h(PdfPTable t, String c1, String c2) {
        t.addCell(cellHeader(c1));
        t.addCell(cellHeader(c2));
    }

    private void fila2(PdfPTable t, String c1, String c2) {
        t.addCell(cellNegrita(c1));
        t.addCell(cellNormal(c2));
    }

    // ── Tablas 3 columnas ──

    private void fila3h(PdfPTable t, String c1, String c2, String c3) {
        t.addCell(cellHeader(c1));
        t.addCell(cellHeader(c2));
        t.addCell(cellHeader(c3));
    }

    private void fila3(PdfPTable t, String c1, String c2, String c3) {
        t.addCell(cellNormal(c1));
        t.addCell(cellCenter(c2));
        t.addCell(cellCenter(c3));
    }

    // ── Tablas 4 columnas ──

    private void fila4h(PdfPTable t, String c1, String c2, String c3, String c4) {
        t.addCell(cellHeader(c1));
        t.addCell(cellHeader(c2));
        t.addCell(cellHeader(c3));
        t.addCell(cellHeader(c4));
    }

    private void fila4c(PdfPTable t, String c1, String c2, String c3, String c4) {
        t.addCell(cellNormal(c1));
        t.addCell(cellCenter(c2));
        t.addCell(cellCenter(c3));
        t.addCell(cellCenter(c4));
    }

    // ── Filas especiales para tabla Puntaje Final ──

    private void filaResumen(PdfPTable t, String num, String fase,
                              String min, String max, boolean bold) {
        PdfPCell cNum  = bold ? cellSubhdr(num)  : cellNormal(num);
        PdfPCell cFase = bold ? cellSubhdr(fase) : cellNormal(fase);
        PdfPCell cMin  = bold ? cellSubhdrC(min) : cellCenter(min);
        PdfPCell cMax  = bold ? cellSubhdrC(max) : cellCenter(max);
        t.addCell(cNum); t.addCell(cFase); t.addCell(cMin); t.addCell(cMax);
    }

    private void filaSubcriterio(PdfPTable t, String fase, String min, String max) {
        PdfPCell cEsp = cellNormal("");
        PdfPCell cFase = cellNormal("   " + fase);
        PdfPCell cMin  = cellCenter(min);
        PdfPCell cMax  = cellCenter(max);
        t.addCell(cEsp); t.addCell(cFase); t.addCell(cMin); t.addCell(cMax);
    }

    private void filaTotal(PdfPTable t, String label, String peso, String min, String max) {
        PdfPCell cLabel = cellSubhdr(label);
        cLabel.setColspan(2);
        t.addCell(cLabel);
        t.addCell(cellSubhdrC(min));
        t.addCell(cellSubhdrC(max));
    }

    // ── Celdas ──

    private PdfPCell cellHeader(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, TABLE_HEADER));
        c.setBackgroundColor(HEADER_BG);
        c.setPadding(5);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return c;
    }

    private PdfPCell cellSubhdr(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, TABLE_BOLD));
        c.setBackgroundColor(SUBHDR_BG);
        c.setPadding(5);
        return c;
    }

    private PdfPCell cellSubhdrC(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, TABLE_BOLD));
        c.setBackgroundColor(SUBHDR_BG);
        c.setPadding(5);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        return c;
    }

    private PdfPCell cellNegrita(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, TABLE_BOLD));
        c.setPadding(5);
        c.setBackgroundColor(LIGHT_BG);
        return c;
    }

    private PdfPCell cellNormal(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, TABLE_CELL));
        c.setPadding(5);
        return c;
    }

    private PdfPCell cellCenter(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, TABLE_CELL));
        c.setPadding(5);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        return c;
    }

    // ── Misceláneos ──

    private String valOrDash(String val) {
        return (val != null && !val.isBlank()) ? val : "—";
    }

    private String noBlanco(String val, String defaultVal) {
        return (val != null && !val.isBlank()) ? val : defaultVal;
    }

    private String noBlanco(String val) {
        return (val != null && !val.isBlank()) ? val : null;
    }

    private String joinAreas(Cronograma c) {
        StringBuilder sb = new StringBuilder();
        if (c.getResponsable() != null && !c.getResponsable().isBlank())
            sb.append(c.getResponsable());
        if (c.getAreaResp1() != null && !c.getAreaResp1().isBlank()) {
            if (sb.length() > 0) sb.append("\n");
            sb.append(c.getAreaResp1());
        }
        if (c.getAreaResp2() != null && !c.getAreaResp2().isBlank()) {
            if (sb.length() > 0) sb.append("\n");
            sb.append(c.getAreaResp2());
        }
        if (c.getAreaResp3() != null && !c.getAreaResp3().isBlank()) {
            if (sb.length() > 0) sb.append("\n");
            sb.append(c.getAreaResp3());
        }
        return sb.length() > 0 ? sb.toString() : "—";
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE EVENT — Encabezado institucional en TODAS las páginas
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Encabezado institucional ACFFAA/OGA — imagen PNG real en todas las páginas.
     *
     * Carga images/header.png desde el classpath del backend
     * (backend/src/main/resources/images/header.png).
     * La imagen se escala al 62 % del ancho de página, alineada a la izquierda,
     * dejando la zona derecha libre para sellos de Firma Digital.
     */
    private static class PageHeaderEvent extends PdfPageEventHelper {

        /** Imagen pre-cargada una sola vez al construir el event (thread-safe en PDF generation). */
        private final Image headerImage;

        PageHeaderEvent() {
            try {
                byte[] imgBytes = PageHeaderEvent.class
                        .getResourceAsStream("/images/header.png")
                        .readAllBytes();
                headerImage = Image.getInstance(imgBytes);
            } catch (Exception e) {
                throw new RuntimeException(
                        "No se pudo cargar images/header.png desde el classpath: " + e.getMessage(), e);
            }
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            try {
                float pageWidth  = document.getPageSize().getWidth();    // 595.28 pt
                float pageHeight = document.getPageSize().getHeight();   // 841.89 pt

                // ~62% del ancho de página — coincide con PDF de referencia
                // (derecha libre para sellos de Firma Digital)
                float imgW = pageWidth * 0.62f;
                float imgH = headerImage.getHeight() * (imgW / headerImage.getWidth());

                // Alineada con el margen izquierdo del contenido (50pt) y
                // con un pequeño offset superior (5pt) para no pegarse al borde
                float imgX = 50f;
                float imgY = pageHeight - imgH - 5f;

                headerImage.setAbsolutePosition(imgX, imgY);
                headerImage.scaleAbsolute(imgW, imgH);

                writer.getDirectContent().addImage(headerImage);

            } catch (Exception e) {
                throw new RuntimeException(
                        "Error renderizando encabezado institucional: " + e.getMessage(), e);
            }
        }
    }
}
