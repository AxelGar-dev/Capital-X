export interface Invoice {
    id: number;
    operationId: number;
    clientId: number;
    folio: string;
    debtor: string;
    amount: number;
    issueDate: Date;
    dueDate: Date;
}

// Lo que el usuario manda en el body del POST — sin id, sin operationId, sin clientId
// (esos los define el sistema al momento de crear)
export type NewInvoice = Pick<Invoice, 'folio' | 'debtor' | 'amount' | 'issueDate' | 'dueDate'>;

export interface Operation {
    id: number;
    clientId: number;
    totalAmount: number;
    advancedAmount: number;
    commission: number;
    amountToDeposit: number;
    createdAt: Date;
    invoices: Invoice[];
}

export interface NewOperation {
    clientId: number;
    invoices: NewInvoice[];
}