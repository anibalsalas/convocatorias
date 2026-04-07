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
 * Generador de Resultados de Entrevista Personal PDF — E27.
 * Lista de postulantes con puntaje de entrevista (promedio comité) y resultado APTO/NO APTO
 * según umbral del factor padre ENTREVISTA (mismo criterio que pantalla ORH).
 */
public class ResultadosEntrevistaPdfGenerator {

    private static final Font TITLE_FONT    = new Font(Font.HELVETICA, 12, Font.BOLD);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 12, Font.BOLD);
    private static final Font SECTION_FONT  = new Font(Font.HELVETICA, 10, Font.BOLD);
    private static final Font BODY_FONT     = new Font(Font.HELVETICA,  9, Font.NORMAL);
    private static final Font BODY_BOLD     = new Font(Font.HELVETICA,  9, Font.BOLD);
    private static final Font TABLE_HEADER  = new Font(Font.HELVETICA,  8, Font.BOLD, Color.WHITE);
    private static final Font TABLE_CELL    = new Font(Font.HELVETICA,  8, Font.NORMAL);
    private static final Font SMALL_FONT    = new Font(Font.HELVETICA,  7, Font.NORMAL);

    private static final Color HEADER_BG     = new Color(15, 52, 96);
    private static final Color APTO_BG      = new Color(198, 239, 206);
    private static final Color NO_APTO_BG   = new Color(255, 199, 206);
    private static final Color PENDIENTE_BG = new Color(245, 245, 245);

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generar(Convocatoria conv, List<Postulacion> postulaciones, BigDecimal umbralEntrevista) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36, 36, 60, 40);
            PdfWriter writer = PdfWriter.getInstance(doc, baos);
            writer.setPageEvent(new HeaderFooterEvent(conv.getNumeroConvocatoria()));
            doc.open();

            agregarTitulo(doc, conv, postulaciones, umbralEntrevista);
            agregarTabla(doc, postulaciones, umbralEntrevista);
            agregarPie(doc, umbralEntrevista);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF entrevista: " + e.getMessage(), e);
        }
    }

    private void agregarTitulo(Document doc, Convocatoria conv, List<Postulacion> posts,
            BigDecimal umbralEntrevista) throws DocumentException {
        ResultadosPdfInstitucionalHeader.addTo(doc);
        Paragraph pProceso = new Paragraph("PROCESO " + conv.getNumeroConvocatoria() + " – ACFFAA", TITLE_FONT);
        pProceso.setAlignment(Element.ALIGN_CENTER);
        pProceso.setSpacingAfter(8f);
        doc.add(pProceso);

        Paragraph pResultados = new Paragraph();
        pResultados.setAlignment(Element.ALIGN_CENTER);
        pResultados.add(new Chunk("RESULTADOS DE LA ENTREVISTA PERSONAL", TITLE_FONT));
        pResultados.add(Chunk.NEWLINE);
        pResultados.add(new Chunk("DE " + truncarObjeto(conv.getObjetoContratacion()).toUpperCase() + ".", SUBTITLE_FONT));
        doc.add(pResultados);
        doc.add(espaciado());

        PdfPTable info = new PdfPTable(4);
        info.setWidthPercentage(100);
        info.setWidths(new float[]{1.5f, 3f, 1.5f, 3f});
        addInfoCell(info, "N° Convocatoria:", conv.getNumeroConvocatoria());
        addInfoCell(info, "Descripción:", safe(conv.getDescripcion()));
        long conPuntaje = posts.stream().filter(p -> p.getPuntajeEntrevista() != null).count();
        addInfoCell(info, "Entrevistados:", String.valueOf(conPuntaje));
        addInfoCell(info, "Fecha Emisión:", LocalDate.now().format(FMT));
        addInfoCell(info, "Umbral mínimo (aprobación):", umbralEntrevista.toPlainString() + " pts");
        addInfoCell(info, "", "");
        doc.add(info);
        doc.add(espaciado());
    }

    private void agregarTabla(Document doc, List<Postulacion> posts, BigDecimal umbralEntrevista)
            throws DocumentException {
        Paragraph sec = new Paragraph("CUADRO DE RESULTADOS — ENTREVISTA PERSONAL", SECTION_FONT);
        sec.setSpacingBefore(6);
        sec.setSpacingAfter(6);
        doc.add(sec);

        PdfPTable tbl = new PdfPTable(4);
        tbl.setWidthPercentage(100);
        tbl.setWidths(new float[]{0.6f, 4.5f, 2f, 1.8f});
        tbl.setHeaderRows(1);

        String[] hdrs = {"N°", "Apellidos y Nombres", "Puntaje Entrevista", "Resultado"};
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
            Postulante pt = p.getPostulante();
            String nombre = pt.getApellidoPaterno() + " " + pt.getApellidoMaterno() + ", " + pt.getNombres();
            String puntajeStr = Optional.ofNullable(p.getPuntajeEntrevista())
                    .map(BigDecimal::toPlainString).orElse("—");

            Color bg;
            String resultado;
            BigDecimal pj = p.getPuntajeEntrevista();
            if (pj == null) {
                bg = PENDIENTE_BG;
                resultado = "PENDIENTE";
            } else if (pj.compareTo(umbralEntrevista) >= 0) {
                bg = APTO_BG;
                resultado = "APTO";
            } else {
                bg = NO_APTO_BG;
                resultado = "NO APTO";
            }
            addRow(tbl, bg, String.valueOf(row + 1), nombre, puntajeStr, resultado);
            row++;
        }
        doc.add(tbl);
    }

    private void agregarPie(Document doc, BigDecimal umbralEntrevista) throws DocumentException {
        doc.add(espaciado());
        Paragraph leyenda = new Paragraph();
        leyenda.add(new Chunk("Nota:  ", BODY_BOLD));
        leyenda.add(new Chunk("El puntaje de entrevista es el promedio de los puntajes otorgados por cada miembro del comité (RF-13 — Quórum > 50%). ", BODY_FONT));
        leyenda.add(new Chunk("APTO: supera o iguala el umbral mínimo (", BODY_FONT));
        leyenda.add(new Chunk(umbralEntrevista.toPlainString() + " pts", BODY_BOLD));
        leyenda.add(new Chunk("). NO APTO: no supera el umbral.", BODY_FONT));
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

    private String safe(String val) { return val != null ? val : "—"; }

    private String truncarObjeto(String obj) {
        if (obj == null) return "—";
        int idx = obj.toUpperCase().indexOf("PARA LA OFICINA");
        return idx > 0 ? obj.substring(0, idx).trim() : obj;
    }

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
            cb.setColorFill(new Color(15, 52, 96));
            cb.rectangle(page.getLeft(), page.getTop() - 28, page.getWidth(), 28);
            cb.fill();
            cb.restoreState();
            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,
                    new Phrase("ACFFAA — Entrevista Personal " + numero,
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
