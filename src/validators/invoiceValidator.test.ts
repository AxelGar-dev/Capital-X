import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { validateInvoice } from './invoiceValidator.js';
import type { NewInvoice } from '../models/operations.js';

const baseInvoice: NewInvoice = {
    folio: 'FOL-001',
    debtor: 'Cliente Demo',
    amount: 1500,
    issueDate: new Date('2026-07-01T00:00:00.000Z'),
    dueDate: new Date('2026-08-15T00:00:00.000Z'), // term = 26 días desde hoy
};

function buildInvoice(overrides: Partial<NewInvoice> = {}): NewInvoice {
    return {
        ...baseInvoice,
        ...overrides,
    };
}

describe('validateInvoice', () => {
    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-20T12:00:00.000Z'));
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    it('returns valid for a correct invoice', () => {
        const result = validateInvoice(buildInvoice());
        expect(result.valid).toBe(true);
    });

    it('rejects blank folio', () => {
        const result = validateInvoice(buildInvoice({ folio: '   ' }));
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('El folio de la factura es obligatorio.');
    });

    it('rejects blank debtor', () => {
        const result = validateInvoice(buildInvoice({ debtor: '   ' }));
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('El deudor de la factura es obligatorio.');
    });

    it('rejects zero amount', () => {
        const result = validateInvoice(buildInvoice({ amount: 0 }));
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('El monto de la factura debe ser mayor a 0.');
    });

    it('rejects negative amount', () => {
        const result = validateInvoice(buildInvoice({ amount: -10 }));
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('El monto de la factura debe ser mayor a 0.');
    });

    it('rejects future issue date', () => {
        const result = validateInvoice(
            buildInvoice({
                issueDate: new Date('2026-07-21T00:00:00.000Z'), // mañana
                dueDate: new Date('2026-08-20T00:00:00.000Z'),
            })
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('La fecha de emisión no puede ser futura.');
    });

    it('rejects due date equal to today', () => {
        const result = validateInvoice(
            buildInvoice({
                issueDate: new Date('2026-07-01T00:00:00.000Z'),
                dueDate: new Date('2026-07-20T00:00:00.000Z'), // = hoy
            })
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('La fecha de vencimiento debe ser posterior a hoy.');
    });

    it('rejects due date before today', () => {
        const result = validateInvoice(
            buildInvoice({
                issueDate: new Date('2026-06-01T00:00:00.000Z'),
                dueDate: new Date('2026-07-10T00:00:00.000Z'), // antes de hoy
            })
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('La fecha de vencimiento debe ser posterior a hoy.');
    });

    it('rejects term shorter than 15 days', () => {
        const result = validateInvoice(
            buildInvoice({
                issueDate: new Date('2026-07-01T00:00:00.000Z'),
                dueDate: new Date('2026-07-25T00:00:00.000Z'), // 5 días desde hoy
            })
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('El plazo restante debe estar entre 15 y 120 días.');
    });

    it('rejects term longer than 120 days', () => {
        const result = validateInvoice(
            buildInvoice({
                issueDate: new Date('2026-07-01T00:00:00.000Z'),
                dueDate: new Date('2026-11-27T00:00:00.000Z'), // 130 días desde hoy
            })
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('El plazo restante debe estar entre 15 y 120 días.');
    });

    it('accepts the minimum allowed term of 15 days', () => {
        const result = validateInvoice(
            buildInvoice({
                issueDate: new Date('2026-07-01T00:00:00.000Z'),
                dueDate: new Date('2026-08-04T00:00:00.000Z'), // 15 días desde hoy
            })
        );

        expect(result.valid).toBe(true);
    });

    it('accepts the maximum allowed term of 120 days', () => {
        const result = validateInvoice(
            buildInvoice({
                issueDate: new Date('2026-07-01T00:00:00.000Z'),
                dueDate: new Date('2026-11-17T00:00:00.000Z'), // 120 días desde hoy
            })
        );

        expect(result.valid).toBe(true);
    });

    it('rejects invalid dates', () => {
        const result = validateInvoice(
            buildInvoice({
                dueDate: new Date('fecha-invalida'),
            })
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Las fechas de la factura no son válidas.');
    });
});