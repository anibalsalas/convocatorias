package pe.gob.acffaa.sisconv.application.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import pe.gob.acffaa.sisconv.domain.model.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Generador de Bases de Convocatoria PDF — E16 CU-11.
 * Formato institucional ACFFAA conforme a CONVOCATORIA_ACFFAA.pdf.
 * Usa OpenPDF 1.3.39 (ya en pom.xml).
 * Consolida: TBL_CONVOCATORIA + TBL_PERFIL_PUESTO + TBL_CRONOGRAMA + TBL_FACTOR_EVALUACION.
 */
public class BasesPdfGenerator {

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 14, Font.BOLD);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 12, Font.BOLD);
    private static final Font SECTION_FONT = new Font(Font.HELVETICA, 11, Font.BOLD);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL);
    private static final Font BODY_BOLD = new Font(Font.HELVETICA, 10, Font.BOLD);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 9, Font.NORMAL);
    private static final Font TABLE_HEADER = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
    private static final Font TABLE_CELL = new Font(Font.HELVETICA, 9, Font.NORMAL);
    private static final Color HEADER_BG = new Color(31, 33, 51);
    private static final Color LIGHT_BG = new Color(245, 245, 245);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generar(Convocatoria conv, PerfilPuesto perfil,
                          List<Cronograma> cronograma, List<FactorEvaluacion> factores) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 50, 50, 60, 50);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            agregarCabecera(doc, conv);
            agregarPerfilPuesto(doc, perfil);
            agregarFunciones(doc, perfil);
            agregarCondiciones(doc, perfil, conv);
            agregarBasesCAS(doc, conv, factores);
            agregarCronograma(doc, cronograma);
            agregarBonificaciones(doc);
            agregarPie(doc, conv);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando bases PDF: " + e.getMessage(), e);
        }
    }

    private void agregarCabecera(Document doc, Convocatoria conv) throws DocumentException {
        Paragraph header = new Paragraph();
        header.setAlignment(Element.ALIGN_CENTER);
        header.add(new Chunk("Agencia de Compras de las Fuerzas Armadas", SECTION_FONT));
        header.add(Chunk.NEWLINE);
        header.add(new Chunk("Oficina General de Administración", BODY_FONT));
        doc.add(header);
        doc.add(new Paragraph(" "));

        Paragraph titulo = new Paragraph();
        titulo.setAlignment(Element.ALIGN_CENTER);
        titulo.add(new Chunk("PROCESO " + conv.getNumeroConvocatoria() + " - ACFFAA", TITLE_FONT));
        titulo.add(Chunk.NEWLINE);
        titulo.add(Chunk.NEWLINE);
        titulo.add(new Chunk("CONVOCATORIA PARA LA CONTRATACIÓN ADMINISTRATIVA", SUBTITLE_FONT));
        titulo.add(Chunk.NEWLINE);
        titulo.add(new Chunk("DE SERVICIOS", SUBTITLE_FONT));
        doc.add(titulo);
        doc.add(new Paragraph(" "));
    }

    private void agregarPerfilPuesto(Document doc, PerfilPuesto perfil) throws DocumentException {
        // I. GENERALIDADES
        doc.add(seccion("I. GENERALIDADES"));
        doc.add(parrafo("1. Objeto de la convocatoria"));
        doc.add(cuerpo("Contratar los servicios para el puesto de " + perfil.getDenominacionPuesto() + "."));
        doc.add(parrafo("2. Dependencia, unidad orgánica y/o área solicitante"));
        doc.add(cuerpo(perfil.getUnidadOrganica()));
        doc.add(parrafo("3. Dependencia encargada de realizar el proceso de contratación"));
        doc.add(cuerpo("Oficina General de Administración."));
        doc.add(parrafo("4. Base legal"));
        doc.add(cuerpo("a. Ley 29849, eliminación progresiva del Régimen Especial del D.Leg. 1057."));
        doc.add(cuerpo("b. Decreto Legislativo N° 1057, Régimen Especial de Contratación Administrativa de Servicios."));
        doc.add(cuerpo("c. D.S. N° 075-2008-PCM, Reglamento del D.Leg. 1057, modificado por D.S. N° 065-2011-PCM."));
        doc.add(cuerpo("d. Demás disposiciones que regulen el Contrato Administrativo de Servicios."));
        doc.add(new Paragraph(" "));

        // II. PERFIL DEL PUESTO
        doc.add(seccion("II. PERFIL DEL PUESTO"));
        PdfPTable tabla = new PdfPTable(2);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{30, 70});
        agregarFilaTabla(tabla, "REQUISITOS", "DETALLES", true);
        agregarFilaTabla(tabla, "Experiencia",
                "General: " + valOrDash(perfil.getExperienciaGeneral()) + "\n"
                        + "Específica: " + valOrDash(perfil.getExperienciaEspecifica()), false);
        agregarFilaTabla(tabla, "Competencias", valOrDash(perfil.getHabilidades()), false);
        agregarFilaTabla(tabla, "Formación Académica", valOrDash(perfil.getFormacionAcademica()), false);
        agregarFilaTabla(tabla, "Cursos / Especialización", valOrDash(perfil.getCursosEspecializacion()), false);
        agregarFilaTabla(tabla, "Conocimientos para el Puesto", valOrDash(perfil.getConocimientosPuesto()), false);
        doc.add(tabla);
        doc.add(new Paragraph(" "));
    }

    private void agregarFunciones(Document doc, PerfilPuesto perfil) throws DocumentException {
        doc.add(seccion("III. CARACTERÍSTICAS DEL PUESTO Y/O CARGO"));
        doc.add(parrafo("Principales funciones a desarrollar:"));
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
        doc.add(new Paragraph(" "));
    }

    private void agregarCondiciones(Document doc, PerfilPuesto perfil, Convocatoria conv) throws DocumentException {
        doc.add(seccion("IV. CONDICIONES ESENCIALES DEL CONTRATO"));
        PdfPTable tabla = new PdfPTable(2);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{40, 60});
        agregarFilaTabla(tabla, "CONDICIONES", "DETALLES", true);

        CondicionPuesto cond = perfil.getCondicion();
        String lugar = cond != null ? cond.getLugarPrestacion() : "Agencia de Compras de las FF.AA., Av. Arequipa 310 - Lima";
        String duracion = cond != null ? cond.getDuracionContrato() : "Según requerimiento";
        String remuneracion = cond != null ? "S/ " + cond.getRemuneracionMensual().toString() : "Según escala institucional";

        agregarFilaTabla(tabla, "Lugar de Prestación", lugar + "\nLunes a viernes de 8:30 a.m. a 5:00 p.m.", false);
        agregarFilaTabla(tabla, "Duración de Contrato", duracion, false);
        agregarFilaTabla(tabla, "Remuneración Mensual", remuneracion + "\nIncluyen montos y afiliaciones de ley.", false);
        doc.add(tabla);
        doc.add(new Paragraph(" "));
    }

    private void agregarBasesCAS(Document doc, Convocatoria conv,
                                  List<FactorEvaluacion> factores) throws DocumentException {
        doc.newPage();
        doc.add(seccion("BASES DEL PROCESO DE SELECCIÓN CAS"));
        doc.add(cuerpo("La Agencia de Compras de las Fuerzas Armadas es un organismo público ejecutor adscrito al "
                + "Ministerio de Defensa, encargado de planificar, organizar y ejecutar el Plan Estratégico de Compras del Sector Defensa."));
        doc.add(new Paragraph(" "));

        // Evaluación Curricular
        doc.add(parrafo("I. EVALUACIÓN CURRICULAR"));
        doc.add(cuerpo("Esta etapa TIENE PUNTAJE Y ES DE CARÁCTER ELIMINATORIO."));
        doc.add(new Paragraph(" "));

        // Tabla de pesos
        doc.add(parrafo("V. PUNTAJE FINAL"));
        PdfPTable pesos = new PdfPTable(4);
        pesos.setWidthPercentage(100);
        pesos.setWidths(new float[]{10, 40, 25, 25});
        agregarFilaTabla4(pesos, "N°", "Fases", "Peso (%)", "Puntaje Máximo", true);

        BigDecimal pesoCurr = conv.getPesoEvalCurricular() != null ? conv.getPesoEvalCurricular() : new BigDecimal("30");
        BigDecimal pesoTec = conv.getPesoEvalTecnica() != null ? conv.getPesoEvalTecnica() : new BigDecimal("35");
        BigDecimal pesoEnt = conv.getPesoEntrevista() != null ? conv.getPesoEntrevista() : new BigDecimal("35");

        agregarFilaTabla4(pesos, "1", "Evaluación curricular", pesoCurr.toString(), pesoCurr.toString(), false);
        agregarFilaTabla4(pesos, "2", "Evaluación técnica", pesoTec.toString(), pesoTec.toString(), false);
        agregarFilaTabla4(pesos, "3", "Entrevista Personal", pesoEnt.toString(), pesoEnt.toString(), false);
        agregarFilaTabla4(pesos, "", "Total", "100", "100", false);
        doc.add(pesos);
        doc.add(new Paragraph(" "));

        // Factores detallados
        if (factores != null && !factores.isEmpty()) {
            doc.add(parrafo("Factores de evaluación configurados:"));
            PdfPTable tf = new PdfPTable(5);
            tf.setWidthPercentage(100);
            tf.setWidths(new float[]{20, 30, 15, 15, 20});
            agregarFila5(tf, "Etapa", "Criterio", "Ptj. Máx.", "Peso %", "Descripción", true);
            for (FactorEvaluacion f : factores) {
                agregarFila5(tf, f.getEtapaEvaluacion(), f.getCriterio(),
                        f.getPuntajeMaximo().toString(), f.getPesoCriterio().toString(),
                        valOrDash(f.getDescripcion()), false);
            }
            doc.add(tf);
        }
        doc.add(new Paragraph(" "));
    }

    private void agregarCronograma(Document doc, List<Cronograma> cronograma) throws DocumentException {
        doc.add(seccion("CRONOGRAMA Y ETAPAS DEL PROCESO"));
        if (cronograma == null || cronograma.isEmpty()) {
            doc.add(cuerpo("Cronograma pendiente de registro."));
            return;
        }
        PdfPTable tabla = new PdfPTable(4);
        tabla.setWidthPercentage(100);
        tabla.setWidths(new float[]{30, 25, 25, 20});
        agregarFilaTabla4(tabla, "Etapa", "Fecha Inicio", "Fecha Fin", "Responsable", true);
        for (Cronograma c : cronograma) {
            agregarFilaTabla4(tabla,
                    c.getEtapa() + " — " + c.getActividad(),
                    c.getFechaInicio() != null ? c.getFechaInicio().format(FMT) : "—",
                    c.getFechaFin() != null ? c.getFechaFin().format(FMT) : "—",
                    valOrDash(c.getResponsable()), false);
        }
        doc.add(tabla);
        doc.add(new Paragraph(" "));
    }

    private void agregarBonificaciones(Document doc) throws DocumentException {
        doc.add(seccion("DE LAS BONIFICACIONES"));
        doc.add(cuerpo("a) Bonificación por ser personal licenciado de las Fuerzas Armadas: 10% sobre el puntaje total."));
        doc.add(cuerpo("b) Bonificación por discapacidad: 15% sobre el puntaje total."));
        doc.add(cuerpo("c) Bonificación por deportista calificado: Conforme al D.S. N° 089-2003-PCM."));
        doc.add(cuerpo("d) Bonificación a jóvenes técnicos y profesionales: Art. 3 de la Ley N° 31533."));
        doc.add(new Paragraph(" "));
    }

    private void agregarPie(Document doc, Convocatoria conv) throws DocumentException {
        doc.add(new Paragraph(" "));
        Paragraph pie = new Paragraph();
        pie.setAlignment(Element.ALIGN_CENTER);
        pie.add(new Chunk("Generado por SISCONV-ACFFAA v2.0", SMALL_FONT));
        pie.add(Chunk.NEWLINE);
        pie.add(new Chunk(conv.getNumeroConvocatoria() + " — " + conv.getDescripcion(), SMALL_FONT));
        doc.add(pie);
    }

    // ── Utilidades ──

    private Paragraph seccion(String texto) {
        Paragraph p = new Paragraph(texto, SECTION_FONT);
        p.setSpacingBefore(10);
        p.setSpacingAfter(6);
        return p;
    }

    private Paragraph parrafo(String texto) {
        Paragraph p = new Paragraph(texto, BODY_BOLD);
        p.setSpacingBefore(4);
        return p;
    }

    private Paragraph cuerpo(String texto) {
        Paragraph p = new Paragraph(texto, BODY_FONT);
        p.setIndentationLeft(20);
        p.setSpacingBefore(2);
        return p;
    }

    private void agregarFilaTabla(PdfPTable tabla, String col1, String col2, boolean header) {
        if (header) {
            tabla.addCell(cellHeader(col1));
            tabla.addCell(cellHeader(col2));
        } else {
            tabla.addCell(cellBold(col1));
            tabla.addCell(cellNormal(col2));
        }
    }

    private void agregarFilaTabla4(PdfPTable tabla, String c1, String c2, String c3, String c4, boolean header) {
        if (header) {
            tabla.addCell(cellHeader(c1));
            tabla.addCell(cellHeader(c2));
            tabla.addCell(cellHeader(c3));
            tabla.addCell(cellHeader(c4));
        } else {
            tabla.addCell(cellNormal(c1));
            tabla.addCell(cellNormal(c2));
            tabla.addCell(cellCenter(c3));
            tabla.addCell(cellCenter(c4));
        }
    }

    private void agregarFila5(PdfPTable tabla, String c1, String c2, String c3, String c4, String c5, boolean header) {
        if (header) {
            tabla.addCell(cellHeader(c1)); tabla.addCell(cellHeader(c2));
            tabla.addCell(cellHeader(c3)); tabla.addCell(cellHeader(c4));
            tabla.addCell(cellHeader(c5));
        } else {
            tabla.addCell(cellNormal(c1)); tabla.addCell(cellNormal(c2));
            tabla.addCell(cellCenter(c3)); tabla.addCell(cellCenter(c4));
            tabla.addCell(cellNormal(c5));
        }
    }

    private PdfPCell cellHeader(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, TABLE_HEADER));
        c.setBackgroundColor(HEADER_BG);
        c.setPadding(6);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        return c;
    }

    private PdfPCell cellBold(String text) {
        PdfPCell c = new PdfPCell(new Phrase(text, BODY_BOLD));
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

    private String valOrDash(String val) {
        return (val != null && !val.isBlank()) ? val : "—";
    }
}
