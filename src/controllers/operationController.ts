import type { Request, Response } from 'express';
import type { OperationService } from '../services/operationService.js';
import type { NewInvoice, NewOperation } from '../models/operation.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../errors/appError.js';

function isBlank(value: unknown): boolean {
    return typeof value !== 'string' || value.trim().length === 0;
}

function parseDate(value: unknown): Date {
    if (typeof value !== 'string') {
        return new Date(NaN);
    }
    return new Date(value);
}

function buildInvoice(raw: unknown, index: number): NewInvoice {
    if (typeof raw !== 'object' || raw === null) {
        throw new AppError(400, `La factura en la posición ${index} no es válida.`);
    }

    const body = raw as Record<string, unknown>;

    if (isBlank(body.folio)) {
        throw new AppError(400, `La factura en la posición ${index} requiere un folio.`);
    }
    if (isBlank(body.debtor)) {
        throw new AppError(400, `La factura en la posición ${index} requiere un deudor.`);
    }
    if (typeof body.amount !== 'number') {
        throw new AppError(400, `La factura en la posición ${index} requiere un monto numérico.`);
    }

    const issueDate = parseDate(body.issueDate);
    const dueDate = parseDate(body.dueDate);
    if (isNaN(issueDate.getTime()) || isNaN(dueDate.getTime())) {
        throw new AppError(400, `La factura en la posición ${index} tiene fechas inválidas.`);
    }

    return {
        folio: body.folio as string,
        debtor: body.debtor as string,
        amount: body.amount,
        issueDate,
        dueDate,
    };
}

export function buildOperationController(operationService: OperationService) {
    const create = asyncHandler(async (req: Request, res: Response) => {
        const body = req.body as Record<string, unknown>;

        if (typeof body.clientId !== 'number') {
            throw new AppError(400, 'El clientId es obligatorio y debe ser numérico.');
        }

        if (!Array.isArray(body.invoices) || body.invoices.length === 0) {
            throw new AppError(400, 'La operación debe incluir al menos una factura.');
        }

        const invoices = body.invoices.map((raw, index) => buildInvoice(raw, index));

        const newOperation: NewOperation = {
            clientId: body.clientId,
            invoices,
        };

        const operation = await operationService.create(newOperation);
        res.status(201).json(operation);
    });

    return { create };
}