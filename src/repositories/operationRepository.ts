import type { NewOperation, Operation } from "../models/operation.js";
export interface OperationRepository {
    create(operation: NewOperation, calculatedFields: {
        totalAmount: number;
        advancedAmount: number;
        commission: number;
        amountToDeposit: number;
    }): Promise<Operation>;

    findExistingFolios(clientId: number, folios: string[]): Promise<string[]>;
}
