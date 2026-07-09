import type { ValidationResult } from "./types.js";

const RFC_PERSONA_MORAL_REGEX = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

function isValidRfcDate(yy: string, mm: string, dd: string): boolean {
    const month = parseInt(mm, 10);
    const day = parseInt(dd, 10);
    const twoDigitYear = parseInt(yy, 10);

    if (month < 1 || month > 12) return false;
    if (day < 1) return false;

    const referenceYear = 2000 + twoDigitYear;
    const isLeapYear =
    (referenceYear % 4 === 0 && referenceYear % 100 !== 0) ||
    referenceYear % 400 === 0;

    const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    const maxDaysThisMonth = daysInMonth[month - 1];

    if (maxDaysThisMonth === undefined) {
        return false;
    }

    return day <= maxDaysThisMonth;
}

export function normalizeRfc(rawRfc: string): string {
    return rawRfc.trim().toUpperCase();
}

export function validateRfc(rawRfc: string): ValidationResult {
    const rfc = normalizeRfc(rawRfc);

    if(rfc.length !== 12) 
        return {
            valid: false,
            reason: `El RFC debe tener exactamente 12 caracteres (se recibieron ${rfc.length}).`,

        }
    if(!RFC_PERSONA_MORAL_REGEX.test(rfc)) {
        return {
            valid: false,
            reason: 'El RFC debe tener el formato: 3 letras + 6 dígitos + 3 caracteres alfanuméricos.',
        }
    }

    const yy = rfc.substring(3, 5);
    const mm = rfc.substring(5, 7);
    const dd = rfc.substring(7, 9);

    if(!isValidRfcDate(yy, mm, dd)) {
        return {
            valid: false,
            reason: `La fecha contenida en el RFC (20${yy}-${mm}-${dd}) no es una fecha válida.`,
        }
    }

    return { valid: true }
} 