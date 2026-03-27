package pe.gob.acffaa.sisconv.application.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import pe.gob.acffaa.sisconv.domain.model.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * Generador de Resultados de Evaluación Curricular PDF — E24.
 * Lista APTO/NO_APTO con puntaje curricular obtenido.
 * Patrón: mismo que ResultadosPdfGenerator (OpenPDF 1.3.39).
 */
public class ResultadosCurricularPdfGenerator {

    private static final Font TITLE_FONT    = new Font(Font.HELVETICA, 14, Font.BOLD);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 11, Font.BOLD);
    private static final Font SECTION_FONT  = new Font(Font.HELVETICA, 10, Font.BOLD);
    private static final Font BODY_FONT     = new Font(Font.HELVETICA, 9,  Font.NORMAL);
    private static final Font BODY_BOLD     = new Font(Font.HELVETICA, 9,  Font.BOLD);
    private static final Font TABLE_HEADER  = new Font(Font.HELVETICA, 8,  Font.BOLD, Color.WHITE);
    private static final Font TABLE_CELL    = new Font(Font.HELVETICA, 8,  Font.NORMAL);
    private static final Font SMALL_FONT    = new Font(Font.HELVETICA, 7,  Font.NORMAL);

    private static final Color HEADER_BG  = new Color(31, 33, 51);
    private static final Color ALT_ROW    = new Color(245, 245, 250);
    private static final Color APTO_BG    = new Color(198, 239, 206);
    private static final Color NO_APTO_BG = new Color(255, 199, 206);

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generar(Convocatoria conv, List<Postulacion> postulaciones, BigDecimal umbralCurricular) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36, 36, 60, 40);
            PdfWriter writer = PdfWriter.getInstance(doc, baos);
            writer.setPageEvent(new HeaderFooterEvent(conv.getNumeroConvocatoria()));
            doc.open();

            agregarTitulo(doc, conv, postulaciones, umbralCurricular);
            agregarTabla(doc, postulaciones, umbralCurricular);
            agregarPie(doc);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF curricular: " + e.getMessage(), e);
        }
    }

    private void agregarTitulo(Document doc, Convocatoria conv, List<Postulacion> posts, BigDecimal umbral) throws DocumentException {
        Paragraph titulo = new Paragraph();
        titulo.setAlignment(Element.ALIGN_CENTER);
        titulo.add(new Chunk("AGENCIA DE COMPRAS DE LAS FUERZAS ARMADAS", SUBTITLE_FONT));
        titulo.add(Chunk.NEWLINE);
        titulo.add(new Chunk("MINISTERIO DE DEFENSA", BODY_FONT));
        titulo.add(Chunk.NEWLINE);
        titulo.add(Chunk.NEWLINE);
        titulo.add(new Chunk("RESULTADOS DE EVALUACIÓN CURRICULAR — RF-09", TITLE_FONT));
        titulo.add(Chunk.NEWLINE);
        titulo.add(new Chunk("PROCESO " + conv.getNumeroConvocatoria(), SUBTITLE_FONT));
        doc.add(titulo);
        doc.add(espaciado());

        PdfPTable info = new PdfPTable(4);
        info.setWidthPercentage(100);
        info.setWidths(new float[]{1.5f, 3f, 1.5f, 3f});
        addInfoCell(info, "N° Convocatoria:", conv.getNumeroConvocatoria());
        addInfoCell(info, "Descripción:", safe(conv.getDescripcion()));
        long aptos   = posts.stream().filter(p -> esAptoPorPuntaje(p, umbral)).count();
        long noAptos = posts.stream().filter(p -> !esAptoPorPuntaje(p, umbral)).count();
        addInfoCell(info, "APTOS / NO APTOS:", aptos + " / " + noAptos);
        addInfoCell(info, "Fecha Emisión:", LocalDate.now().format(FMT));
        doc.add(info);
        doc.add(espaciado());
    }

    private void agregarTabla(Document doc, List<Postulacion> posts, BigDecimal umbral) throws DocumentException {
        Paragraph sec = new Paragraph("CUADRO DE RESULTADOS EVALUACIÓN CURRICULAR", SECTION_FONT);
        sec.setSpacingBefore(6);
        sec.setSpacingAfter(6);
        doc.add(sec);

        PdfPTable tbl = new PdfPTable(4);
        tbl.setWidthPercentage(100);
        tbl.setWidths(new float[]{0.6f, 4.5f, 2f, 1.8f});
        tbl.setHeaderRows(1);

        String[] hdrs = {"N°", "Apellidos y Nombres", "Puntaje Curricular", "Resultado"};
        for (String h : hdrs) {
            PdfPCell cell = new PdfPCell(new Phrase(h, TABLE_HEADER));
            cell.setBackgroundColor(HEADER_BG);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            cell.setPadding(5);
            tbl.addCell(cell);
        }

        int row = 0;
        for (Postulacion p : posts) {
            boolean apto = esAptoPorPuntaje(p, umbral);
            Color bg = apto ? APTO_BG : (row % 2 == 0 ? new Color(255, 230, 230) : new Color(255, 210, 210));
            Postulante pt = p.getPostulante();
            String nombre = pt.getApellidoPaterno() + " " + pt.getApellidoMaterno() + ", " + pt.getNombres();
            String puntaje = Optional.ofNullable(p.getPuntajeCurricular())
                    .map(BigDecimal::toPlainString).orElse("—");
            String resultado = apto ? "APTO" : "NO_APTO";
            addRow(tbl, bg, String.valueOf(row + 1), nombre, puntaje, resultado);
            row++;
        }
        doc.add(tbl);
    }

    private void agregarPie(Document doc) throws DocumentException {
        doc.add(espaciado());
        Paragraph leyenda = new Paragraph();
        leyenda.add(new Chunk("Leyenda:  ", BODY_BOLD));
        leyenda.add(new Chunk("APTO — supera el umbral mínimo configurado    ", BODY_FONT));
        leyenda.add(new Chunk("NO APTO — no supera el umbral mínimo", BODY_FONT));
        doc.add(leyenda);
        doc.add(espaciado());
        Paragraph firma = new Paragraph();
        firma.setAlignment(Element.ALIGN_RIGHT);
        firma.add(new Chunk("Generado el " + LocalDate.now().format(FMT)
                + " — Sistema de Convocatorias CAS — ACFFAA", SMALL_FONT));
        doc.add(firma);
    }

    private void addInfoCell(PdfPTable table, String label, String value) {
        PdfPCell lbl = new PdfPCell(new Phrase(label, BODY_BOLD));
        lbl.setBorder(Rectangle.NO_BORDER); lbl.setPadding(3);
        table.addCell(lbl);
        PdfPCell val = new PdfPCell(new Phrase(value, BODY_FONT));
        val.setBorder(Rectangle.NO_BORDER); val.setPadding(3);
        table.addCell(val);
    }

    private void addRow(PdfPTable tbl, Color bg, String... values) {
        for (int i = 0; i < values.length; i++) {
            PdfPCell cell = new PdfPCell(new Phrase(values[i], TABLE_CELL));
            cell.setBackgroundColor(bg);
            cell.setPadding(4);
            cell.setHorizontalAlignment(i == 0 || i >= 2 ? Element.ALIGN_CENTER : Element.ALIGN_LEFT);
            tbl.addCell(cell);
        }
    }

    /** APTO si puntajeCurricular >= umbralCurricular configurado en los factores (RF-09). */
    private static boolean esAptoPorPuntaje(Postulacion p, BigDecimal umbral) {
        BigDecimal puntaje = p.getPuntajeCurricular();
        return puntaje != null && puntaje.compareTo(umbral) >= 0;
    }

    private String safe(String val) { return val != null ? val : "—"; }

    private Paragraph espaciado() {
        Paragraph p = new Paragraph(" ");
        p.setSpacingAfter(4);
        return p;
    }

    private static class HeaderFooterEvent extends PdfPageEventHelper {
        private final String numero;
        HeaderFooterEvent(String numero) { this.numero = numero; }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            Rectangle page = document.getPageSize();
            cb.saveState();
            cb.setColorFill(new Color(31, 33, 51));
            cb.rectangle(page.getLeft(), page.getTop() - 28, page.getWidth(), 28);
            cb.fill();
            cb.restoreState();
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,
                    new Phrase("ACFFAA — Evaluación Curricular " + numero,
                            new Font(Font.HELVETICA, 8, Font.BOLD, Color.WHITE)),
                    page.getLeft() + 10, page.getTop() - 18, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                    new Phrase("MINISTERIO DE DEFENSA",
                            new Font(Font.HELVETICA, 7, Font.NORMAL, Color.WHITE)),
                    page.getRight() - 10, page.getTop() - 18, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                    new Phrase("Página " + writer.getPageNumber(),
                            new Font(Font.HELVETICA, 7, Font.NORMAL, Color.GRAY)),
                    page.getRight() - 10, page.getBottom() + 10, 0);
        }
    }
}
