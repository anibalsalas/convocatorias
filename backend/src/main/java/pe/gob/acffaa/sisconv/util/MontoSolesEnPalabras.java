package pe.gob.acffaa.sisconv.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Convierte montos en soles a letras (formato documental tipo “cinco mil con 00/100 soles”).
 * Alcance: parte entera 0–999 999 (suficiente para remuneraciones CAS habituales).
 */
public final class MontoSolesEnPalabras {

    private MontoSolesEnPalabras() {
    }

    public static String format(BigDecimal monto) {
        if (monto == null) {
            return "";
        }
        BigDecimal scaled = monto.setScale(2, RoundingMode.HALF_UP);
        long intPart = scaled.longValue();
        if (intPart < 0 || intPart > 999_999L) {
            return "";
        }
        int cents = scaled.remainder(BigDecimal.ONE).movePointRight(2).abs().intValue() % 100;
        String letras = capitalizar(convertirEntero(intPart));
        return letras + " con " + String.format("%02d", cents) + "/100 soles";
    }

    private static String capitalizar(String s) {
        if (s == null || s.isEmpty()) {
            return s;
        }
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String convertirEntero(long n) {
        if (n == 0) {
            return "cero";
        }
        if (n < 0 || n > 999_999) {
            return "";
        }
        if (n < 1000) {
            return menorMil((int) n);
        }
        if (n < 1_000_000) {
            int miles = (int) (n / 1000);
            int resto = (int) (n % 1000);
            String prefijo = miles == 1 ? "mil" : menorMil(miles) + " mil";
            if (resto == 0) {
                return prefijo;
            }
            return prefijo + " " + menorMil(resto);
        }
        return "";
    }

    /** 1..999 */
    private static String menorMil(int n) {
        if (n <= 0 || n >= 1000) {
            return "";
        }
        if (n < 30) {
            return unidadesYDecenas(n);
        }
        int c = n / 100;
        int r = n % 100;
        String cent = switch (c) {
            case 1 -> r == 0 ? "cien" : "ciento";
            case 2 -> "doscientos";
            case 3 -> "trescientos";
            case 4 -> "cuatrocientos";
            case 5 -> "quinientos";
            case 6 -> "seiscientos";
            case 7 -> "setecientos";
            case 8 -> "ochocientos";
            case 9 -> "novecientos";
            default -> "";
        };
        if (r == 0) {
            return cent;
        }
        return cent + " " + unidadesYDecenas(r);
    }

    private static String unidadesYDecenas(int n) {
        if (n <= 0) {
            return "";
        }
        if (n < 16) {
            return switch (n) {
                case 1 -> "uno";
                case 2 -> "dos";
                case 3 -> "tres";
                case 4 -> "cuatro";
                case 5 -> "cinco";
                case 6 -> "seis";
                case 7 -> "siete";
                case 8 -> "ocho";
                case 9 -> "nueve";
                case 10 -> "diez";
                case 11 -> "once";
                case 12 -> "doce";
                case 13 -> "trece";
                case 14 -> "catorce";
                case 15 -> "quince";
                default -> "";
            };
        }
        if (n < 20) {
            return "dieci" + unidadesYDecenas(n - 10);
        }
        if (n < 30) {
            if (n == 20) {
                return "veinte";
            }
            return "veinti" + unidadesYDecenas(n - 20);
        }
        int d = n / 10;
        int u = n % 10;
        String dec = switch (d) {
            case 3 -> "treinta";
            case 4 -> "cuarenta";
            case 5 -> "cincuenta";
            case 6 -> "sesenta";
            case 7 -> "setenta";
            case 8 -> "ochenta";
            case 9 -> "noventa";
            default -> "";
        };
        if (u == 0) {
            return dec;
        }
        return dec + " y " + unidadesYDecenas(u);
    }
}
