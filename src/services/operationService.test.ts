import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../errors/appError.js';
import { InMemoryClientRepository } from '../repositories/inMemoryClientRepository.js';
import { InMemoryOperationRepository } from '../repositories/inMemoryOperationRepository.js';
import { OperationService } from './operationService.js';
import type { NewInvoice } from '../models/operation.js';

const FIXED_NOW = new Date('2026-07-20T12:00:00.000Z');

const baseInvoice: NewInvoice = {
    folio: 'FOL-001',
    debtor: 'Cliente Demo',
    amount: 100,
    issueDate: new Date('2026-07-01T00:00:00.000Z'),
    dueDate: new Date('2026-08-15T00:00:00.000Z'),
};

function buildInvoice(overrides: Partial<NewInvoice> = {}): NewInvoice {
    return {
        ...baseInvoice,
        ...overrides,
    };
}

describe('OperationService', () => {
    let operationRepository: InMemoryOperationRepository;
    let clientRepository: InMemoryClientRepository;
    let operationService: OperationService;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_NOW);
    });

    beforeEach(() => {
        operationRepository = new InMemoryOperationRepository();
        clientRepository = new InMemoryClientRepository();
        operationService = new OperationService(operationRepository, clientRepository);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    async function createClient(status: 'pending' | 'approved' = 'approved') {
        const client = await clientRepository.create({
            businessName: 'Empresa Demo',
            rfc: 'ABC850315XY1',
            email: 'contacto@empresa.com',
        });

        if (status === 'approved') {
            await clientRepository.updateStatus(client.id, 'approved');
        }

        return client;
    }

    async function createApprovedOperation(clientId: number, invoices: NewInvoice[]) {
        return operationService.create({
            clientId,
            invoices,
        });
    }

    describe('create', () => {
        it('throws 404 when the client does not exist', async () => {
            await expect(
                operationService.create({
                    clientId: 999,
                    invoices: [buildInvoice()],
                })
            ).rejects.toMatchObject({
                statusCode: 404,
                message: 'El cliente no existe.',
            });
        });

        it('throws 403 when the client is not approved', async () => {
            const client = await createClient('pending');

            await expect(
                operationService.create({
                    clientId: client.id,
                    invoices: [buildInvoice()],
                })
            ).rejects.toMatchObject({
                statusCode: 403,
                message: 'El cliente no está aprobado para operar.',
            });
        });

        it('throws 400 when the invoice list is empty', async () => {
            const client = await createClient('approved');

            await expect(
                operationService.create({
                    clientId: client.id,
                    invoices: [],
                })
            ).rejects.toMatchObject({
                statusCode: 400,
                message: 'La operación debe incluir al menos una factura.',
            });
        });

        it('throws 422 with details for one invalid invoice', async () => {
            const client = await createClient('approved');

            await expect(
                operationService.create({
                    clientId: client.id,
                    invoices: [
                        buildInvoice({
                            folio: '   ',
                        }),
                    ],
                })
            ).rejects.toMatchObject({
                statusCode: 422,
                message: 'Una o más facturas son inválidas.',
                details: [
                    {
                        folio: '   ',
                        reason: 'El folio de la factura es obligatorio.',
                    },
                ],
            });
        });

        it('throws 422 with accumulated details for multiple invalid invoices', async () => {
            const client = await createClient('approved');

            await expect(
                operationService.create({
                    clientId: client.id,
                    invoices: [
                        buildInvoice({
                            folio: '   ',
                        }),
                        buildInvoice({
                            folio: 'FOL-002',
                            amount: 0,
                        }),
                    ],
                })
            ).rejects.toMatchObject({
                statusCode: 422,
                message: 'Una o más facturas son inválidas.',
                details: [
                    {
                        folio: '   ',
                        reason: 'El folio de la factura es obligatorio.',
                    },
                    {
                        folio: 'FOL-002',
                        reason: 'El monto de la factura debe ser mayor a 0.',
                    },
                ],
            });
        });

        it('throws 422 when a folio is duplicated within the same request', async () => {
            const client = await createClient('approved');

            await expect(
                operationService.create({
                    clientId: client.id,
                    invoices: [
                        buildInvoice({
                            folio: 'FOL-DUP',
                        }),
                        buildInvoice({
                            folio: 'FOL-DUP',
                            amount: 200,
                            dueDate: new Date('2026-08-15T00:00:00.000Z'),
                        }),
                    ],
                })
            ).rejects.toMatchObject({
                statusCode: 422,
                message: 'Una o más facturas son inválidas.',
                details: [
                    {
                        folio: 'FOL-DUP',
                        reason: 'El folio está duplicado dentro de la misma solicitud.',
                    },
                    {
                        folio: 'FOL-DUP',
                        reason: 'El folio está duplicado dentro de la misma solicitud.',
                    },
                ],
            });
        });

        it('throws 422 when a folio was already financed before', async () => {
            const client = await createClient('approved');

            await createApprovedOperation(client.id, [
                buildInvoice({
                    folio: 'FOL-HIST',
                    amount: 100,
                }),
            ]);

            await expect(
                operationService.create({
                    clientId: client.id,
                    invoices: [
                        buildInvoice({
                            folio: 'FOL-HIST',
                            amount: 150,
                            dueDate: new Date('2026-08-20T00:00:00.000Z'),
                        }),
                    ],
                })
            ).rejects.toMatchObject({
                statusCode: 422,
                message: 'Una o más facturas son inválidas.',
                details: [
                    {
                        folio: 'FOL-HIST',
                        reason: 'El folio ya fue financiado anteriormente.',
                    },
                ],
            });
        });

        it('creates an operation and calculates totals correctly', async () => {
            const client = await createClient('approved');

            const result = await operationService.create({
                clientId: client.id,
                invoices: [
                    buildInvoice({
                        folio: 'FOL-100',
                        amount: 100.33,
                        dueDate: new Date('2026-08-15T00:00:00.000Z'),
                    }),
                    buildInvoice({
                        folio: 'FOL-200',
                        amount: 200.22,
                        dueDate: new Date('2026-08-20T00:00:00.000Z'),
                    }),
                ],
            });

            expect(result.clientId).toBe(client.id);
            expect(result.totalAmount).toBe(300.55);
            expect(result.advancedAmount).toBe(255.47);
            expect(result.commission).toBe(4.51);
            expect(result.amountToDeposit).toBe(250.96);
            expect(result.invoices).toHaveLength(2);
            expect(result.invoices.map((invoice) => invoice.folio)).toEqual(['FOL-100', 'FOL-200']);
        });
    });

    describe('getClientSummary', () => {
        it('throws 404 when the client does not exist', async () => {
            await expect(operationService.getClientSummary(999)).rejects.toMatchObject({
                statusCode: 404,
                message: 'El cliente no existe.',
            });
        });

        it('returns zeros and null for a client without operations', async () => {
            const client = await createClient('approved');

            await expect(operationService.getClientSummary(client.id)).resolves.toEqual({
                operationsCount: 0,
                totalAdvancedAmount: 0,
                nearestDueDate: null,
            });
        });

        it('summarizes multiple operations and returns the nearest due date', async () => {
            const client = await createClient('approved');

            await createApprovedOperation(client.id, [
                buildInvoice({
                    folio: 'OP-1-A',
                    amount: 100,
                    dueDate: new Date('2026-08-15T00:00:00.000Z'),
                }),
                buildInvoice({
                    folio: 'OP-1-B',
                    amount: 200,
                    dueDate: new Date('2026-08-04T00:00:00.000Z'),
                }),
            ]);

            await createApprovedOperation(client.id, [
                buildInvoice({
                    folio: 'OP-2-A',
                    amount: 300,
                    dueDate: new Date('2026-08-10T00:00:00.000Z'),
                }),
            ]);

            await expect(operationService.getClientSummary(client.id)).resolves.toEqual({
                operationsCount: 2,
                totalAdvancedAmount: 510,
                nearestDueDate: '2026-08-04',
            });
        });
    });
});
