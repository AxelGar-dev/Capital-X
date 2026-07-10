import type { NewInvoice } from '../models/operation.js';
import type { ValidationResult } from './types.js';

const MIN_TERM_DAYS = 15;
const MAX_TERM_DAYS = 120;
const MS_PER_DAY = 86400000;

function isBlank(value: string): boolean {
    return value.trim().length === 0;
}

// Normaliza a medianoche UTC para comparar solo fechas, sin horas
function toUtcMidnight(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function validateInvoice(invoice: NewInvoice): ValidationResult {
    if (isBlank(invoice.folio)) {
        return { valid: false, reason: 'El folio de la factura es obligatorio.' };
    }

    if (isBlank(invoice.debtor)) {
        return { valid: false, reason: 'El deudor de la factura es obligatorio.' };
    }

    if (invoice.amount <= 0) {
        return { valid: false, reason: 'El monto de la factura debe ser mayor a 0.' };
    }

    if (isNaN(invoice.issueDate.getTime()) || isNaN(invoice.dueDate.getTime())) {
        return { valid: false, reason: 'Las fechas de la factura no son válidas.' };
    }

    const issueDateMs = toUtcMidnight(invoice.issueDate);
    const dueDateMs = toUtcMidnight(invoice.dueDate);
    const todayMs = toUtcMidnight(new Date());

    if (issueDateMs > todayMs) {
        return { valid: false, reason: 'La fecha de emisión no puede ser futura.' };
    }

    if (dueDateMs <= todayMs) {
        return { valid: false, reason: 'La fecha de vencimiento debe ser posterior a hoy.' };
    }

    if (dueDateMs <= issueDateMs) {
        return { valid: false, reason: 'La fecha de vencimiento debe ser posterior a la fecha de emisión.' };
    }

    const termDays = (dueDateMs - todayMs) / MS_PER_DAY;

    if (termDays < MIN_TERM_DAYS || termDays > MAX_TERM_DAYS) {
        return { valid: false, reason: `El plazo restante debe estar entre ${MIN_TERM_DAYS} y ${MAX_TERM_DAYS} días.` };
    }

    return { valid: true };
}