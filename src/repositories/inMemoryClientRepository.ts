import type { Client, NewClient } from '../models/client.js';
import type { ClientRepository } from './clientRepository.js';

export class InMemoryClientRepository implements ClientRepository {
    private clients: Client[] = [];
    private nextId = 1;

    async create(client: NewClient): Promise<Client> {
    const newClient: Client = {
        id: this.nextId++,
        businessName: client.businessName,
        rfc: client.rfc,
        email: client.email,
        status: 'pending',
        createdAt: new Date(),
    };
        this.clients.push(newClient);
        return newClient;
    }

    async findById(id: number): Promise<Client | null> {
        return this.clients.find((c) => c.id === id) ?? null;
    }

    async findByRfc(rfc: string): Promise<Client | null> {
        return this.clients.find((c) => c.rfc === rfc) ?? null;
    }

    async updateStatus(id: number, status: 'approved'): Promise<Client | null> {
        const client = await this.findById(id);
        if (!client) return null;
        client.status = status;
        return client;
    }
}