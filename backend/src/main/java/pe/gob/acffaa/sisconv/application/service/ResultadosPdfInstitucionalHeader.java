package pe.gob.acffaa.sisconv.application.service;

import com.lowagie.text.BadElementException;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;

import java.io.IOException;
import java.io.InputStream;

/**
 * Membrete común para PDFs de resultados (curricular, técnica, entrevista, finales).
 * Carga {@code /assets/images/header.png} del classpath y el lema institucional.
 */
public final class ResultadosPdfInstitucionalHeader {

    private static final String RESOURCE_PATH = "/assets/images/header.jpg";

    /** Lema debajo del membrete gráfico — plantilla resultados CAS ACFFAA. */
    public static final String LEMA_INSTITUCIONAL =
            "Año de la Esperanza y el Fortalecimiento de la Democracia";

    private static final Font LEMA_FONT = new Font(Font.HELVETICA, 10, Font.ITALIC);

    private ResultadosPdfInstitucionalHeader() {
    }

    /**
     * Inserta imagen centrada (escalada al ancho útil) y el lema centrado.
     * Debe llamarse tras {@code doc.open()} para que {@link Document#getPageSize()} sea correcto
     * (portrait o landscape).
     */
    public static void addTo(Document doc) throws DocumentException {
        final Image img;
        try {
            img = Image.getInstance(loadHeaderBytes());
        } catch (BadElementException | IOException e) {
            throw new IllegalStateException("No se pudo cargar la imagen del membrete PDF", e);
        }
        float pageW = doc.getPageSize().getWidth() - doc.leftMargin() - doc.rightMargin();
        float maxW = pageW * 0.55f;
        float maxH = 80f;
        img.scaleToFit(maxW, maxH);
        img.setAlignment(Element.ALIGN_CENTER);
        doc.add(img);

        Paragraph lema = new Paragraph("\u201C" + LEMA_INSTITUCIONAL + "\u201D", LEMA_FONT);
        lema.setAlignment(Element.ALIGN_CENTER);
        lema.setSpacingAfter(10f);
        lema.setSpacingBefore(4f);
        doc.add(lema);
    }

    private static byte[] loadHeaderBytes() {
        try (InputStream in = ResultadosPdfInstitucionalHeader.class.getResourceAsStream(RESOURCE_PATH)) {
            if (in == null) {
                throw new IllegalStateException(
                        "Recurso no encontrado en classpath: " + RESOURCE_PATH
                                + " — coloque header.png en src/main/resources/assets/images/");
            }
            return in.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo leer " + RESOURCE_PATH, e);
        }
    }
}
