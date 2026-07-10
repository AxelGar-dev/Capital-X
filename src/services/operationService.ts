import type { ClientRepository } from '../repositories/clientRepository.js';
import type { OperationRepository } from '../repositories/operationRepository.js';
import type { NewOperation, Operation } from '../models/operation.js';
import { validateInvoice } from '../validators/invoiceValidator.js';
import { AppError } from '../errors/appError.js';

const ADVANCE_RATE = 0.85;
const COMMISSION_RATE = 0.015;

function roundTo2Decimals(value: number): number {
    return Math.round(value * 100) / 100;
}

interface InvoiceError {
    folio: string;
    reason: string;
}

export class OperationService {
    constructor(
        private readonly operationRepository: OperationRepository,
        private readonly clientRepository: ClientRepository
    ) {}

    async create(newOperation: NewOperation): Promise<Operation> {
        const client = await this.clientRepository.findById(newOperation.clientId);
        if (!client) {
            throw new AppError(404, 'El cliente no existe.');
        }

        if (client.status !== 'approved') {
            throw new AppError(403, 'El cliente no está aprobado para operar.');
        }

        if (newOperation.invoices.length === 0) {
            throw new AppError(400, 'La operación debe incluir al menos una factura.');
        }

        const errors: InvoiceError[] = [];

        const seenFolios = new Set<string>();
        const duplicatedInRequest = new Set<string>();
        for (const invoice of newOperation.invoices) {
            if (seenFolios.has(invoice.folio)) {
                duplicatedInRequest.add(invoice.folio);
            }
            seenFolios.add(invoice.folio);
        }

        for (const invoice of newOperation.invoices) {
            const result = validateInvoice(invoice);
            if (!result.valid) {
                errors.push({ folio: invoice.folio, reason: result.reason! });
                continue;
            }
            if (duplicatedInRequest.has(invoice.folio)) {
                errors.push({
                    folio: invoice.folio,
                    reason: 'El folio está duplicado dentro de la misma solicitud.',
                });
            }
        }

        const existingFolios = await this.operationRepository.findExistingFolios(
            newOperation.clientId,
            newOperation.invoices.map((invoice) => invoice.folio)
        );
        for (const folio of existingFolios) {
            errors.push({ folio, reason: 'El folio ya fue financiado anteriormente.' });
        }

        if (errors.length > 0) {
            throw new AppError(422, 'Una o más facturas son inválidas.', errors);
        }

        const totalAmount = roundTo2Decimals(
            newOperation.invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
        );
        const advancedAmount = roundTo2Decimals(totalAmount * ADVANCE_RATE);
        const commission = roundTo2Decimals(totalAmount * COMMISSION_RATE);
        const amountToDeposit = roundTo2Decimals(advancedAmount - commission);

        return this.operationRepository.create(newOperation, {
            totalAmount,
            advancedAmount,
            commission,
            amountToDeposit,
        });
    }
}