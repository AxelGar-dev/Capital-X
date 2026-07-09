import type { Client, NewClient } from "../models/client.js";
import type { ClientRepository } from "./clientRepository.js";

export class MysqlClientRepository implements ClientRepository {
    async create(client: NewClient): Promise<Client> {
        throw new Error('Not implemented yet');
    }

    async findById(id: number): Promise<Client | null> {
        throw new Error('Not implemented yet');
    }

    async findByRfc(rfc: string): Promise<Client | null> {
        throw new Error('Not implemented yet');
    }

    async updateStatus(id: number, status: 'approved'): Promise<Client | null> {
        throw new Error('Not implemented yet');
    }
}