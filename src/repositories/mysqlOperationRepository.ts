import type { Pool } from 'mysql2/promise';
import type { NewOperation, Operation, Invoice } from '../models/operations.js';
import type { OperationRepository } from './operationRepository.js';

interface OperationRow {
    id: number;
    client_id: number;
    total_amount: string;
    advanced_amount: string;
    commission: string;
    amount_to_deposit: string;
    created_at: Date;
}

interface InvoiceRow {
    id: number;
    operation_id: number;
    client_id: number;
    folio: string;
    debtor: string;
    amount: string;
    issue_date: Date;
    due_date: Date;
}

function mapRowToOperation(row: OperationRow, invoices: Invoice[]): Operation {
    return {
        id: row.id,
        clientId: row.client_id,
        totalAmount: Number(row.total_amount),
        advancedAmount: Number(row.advanced_amount),
        commission: Number(row.commission),
        amountToDeposit: Number(row.amount_to_deposit),
        createdAt: row.created_at,
        invoices,
    };
}

function mapRowToInvoice(row: InvoiceRow): Invoice {
    return {
        id: row.id,
        operationId: row.operation_id,
        clientId: row.client_id,
        folio: row.folio,
        debtor: row.debtor,
        amount: Number(row.amount),
        issueDate: row.issue_date,
        dueDate: row.due_date,
    };
}

export class MysqlOperationRepository implements OperationRepository {
    constructor(private readonly pool: Pool) {}

    async create(
        operation: NewOperation,
        calculatedFields: {
            totalAmount: number;
            advancedAmount: number;
            commission: number;
            amountToDeposit: number;
        }
    ): Promise<Operation> {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            const [operationResult] = await connection.query(
                'INSERT INTO operations (client_id, total_amount, advanced_amount, commission, amount_to_deposit) VALUES (?, ?, ?, ?, ?)',
                [
                    operation.clientId,
                    calculatedFields.totalAmount,
                    calculatedFields.advancedAmount,
                    calculatedFields.commission,
                    calculatedFields.amountToDeposit,
                ]
            );
            const operationId = (operationResult as { insertId: number }).insertId;

            const invoiceValues = operation.invoices.map((invoice) => [
                operationId,
                operation.clientId,
                invoice.folio,
                invoice.debtor,
                invoice.amount,
                invoice.issueDate,
                invoice.dueDate,
            ]);

            await connection.query(
                'INSERT INTO invoices (operation_id, client_id, folio, debtor, amount, issue_date, due_date) VALUES ?',
                [invoiceValues]
            );

            const [operationRows] = await connection.query(
                'SELECT * FROM operations WHERE id = ?',
                [operationId]
            );
            const [invoiceRows] = await connection.query(
                'SELECT * FROM invoices WHERE operation_id = ?',
                [operationId]
            );

            await connection.commit();

            const operationRow = (operationRows as OperationRow[])[0];
            if (!operationRow) {
                throw new Error('No se pudo recuperar la operación recién creada.');
            }

            const invoices = (invoiceRows as InvoiceRow[]).map(mapRowToInvoice);
            return mapRowToOperation(operationRow, invoices);
        }
        catch (err) {
            await connection.rollback();
            throw err;
        }
        finally {
            connection.release();
        }
    }

    async findExistingFolios(clientId: number, folios: string[]): Promise<string[]> {
        const [rows] = await this.pool.query(
            'SELECT folio FROM invoices WHERE client_id = ? AND folio IN (?)',
            [clientId, folios]
        );
        return (rows as { folio: string }[]).map((row) => row.folio);
    }
}