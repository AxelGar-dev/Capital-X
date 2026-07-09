import type { Client, NewClient } from '../models/client.js';

export interface ClientRepository {
    create(client: NewClient): Promise<Client>;
    findById(id: number): Promise<Client | null>;
    findByRfc(rfc: string): Promise<Client | null>;
    updateStatus(id: number, status: 'approved'): Promise<Client | null>;
}