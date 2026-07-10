import type { NewOperation, Operation, Invoice, ClientSummary } from '../models/operation.js';
import type { OperationRepository } from './operationRepository.js';

export class InMemoryOperationRepository implements OperationRepository {
    private operations: Operation[] = [];
    private nextOperationId = 1;
    private nextInvoiceId = 1;

    async create(
        operation: NewOperation,
        calculatedFields: {
            totalAmount: number;
            advancedAmount: number;
            commission: number;
            amountToDeposit: number;
        }
    ): Promise<Operation> {
        const operationId = this.nextOperationId++;

        const invoices: Invoice[] = operation.invoices.map((invoice) => ({
            id: this.nextInvoiceId++,
            operationId,
            clientId: operation.clientId,
            folio: invoice.folio,
            debtor: invoice.debtor,
            amount: invoice.amount,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
        }));

        const newOperation: Operation = {
            id: operationId,
            clientId: operation.clientId,
            totalAmount: calculatedFields.totalAmount,
            advancedAmount: calculatedFields.advancedAmount,
            commission: calculatedFields.commission,
            amountToDeposit: calculatedFields.amountToDeposit,
            createdAt: new Date(),
            invoices,
        };

        this.operations.push(newOperation);
        return newOperation;
    }

    async findExistingFolios(clientId: number, folios: string[]): Promise<string[]> {
        const folioSet = new Set(folios);
        const existing: string[] = [];

        for (const operation of this.operations) {
            if (operation.clientId !== clientId) continue;
            for (const invoice of operation.invoices) {
                if (folioSet.has(invoice.folio)) {
                    existing.push(invoice.folio);
                }
            }
        }

        return existing;
    }

    async getClientSummary(clientId: number): Promise<ClientSummary> {
        const clientOperations = this.operations.filter((op) => op.clientId === clientId);

        const operationsCount = clientOperations.length;
        const totalAdvancedAmount = clientOperations.reduce(
            (sum, op) => sum + op.advancedAmount,
            0
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let nearestDueDate: Date | null = null;
        for (const operation of clientOperations) {
            for (const invoice of operation.invoices) {
                if (invoice.dueDate > today) {
                    if (nearestDueDate === null || invoice.dueDate < nearestDueDate) {
                        nearestDueDate = invoice.dueDate;
                    }
                }
            }
        }

        return { operationsCount, totalAdvancedAmount, nearestDueDate: nearestDueDate ? nearestDueDate.toISOString().slice(0, 10) : null, };
    }
}