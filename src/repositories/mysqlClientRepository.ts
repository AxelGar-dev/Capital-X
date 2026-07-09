import type { Pool } from 'mysql2/promise';
import type { Client, NewClient } from '../models/client.js';
import type { ClientRepository } from './clientRepository.js';

interface ClientRow {
    id: number;
    business_name: string;
    rfc: string;
    email: string;
    status: 'pending' | 'approved';
    created_at: Date;
}

function mapRowToClient(row: ClientRow): Client {
    return {
        id: row.id,
        businessName: row.business_name,
        rfc: row.rfc,
        email: row.email,
        status: row.status,
        createdAt: row.created_at,
    };
}

export class MysqlClientRepository implements ClientRepository {
    constructor(private readonly pool: Pool) {}

    async create(client: NewClient): Promise<Client> {
        const [result] = await this.pool.query(
            'INSERT INTO clients (business_name, rfc, email, status) VALUES (?, ?, ?, ?)',
            [client.businessName, client.rfc, client.email, 'pending']
        );
        const insertId = (result as { insertId: number }).insertId;
        const created = await this.findById(insertId);
        return created!;
    }

    async findById(id: number): Promise<Client | null> {
        const [rows] = await this.pool.query('SELECT * FROM clients WHERE id = ?', [id]);
        const row = (rows as ClientRow[])[0];
        return row ? mapRowToClient(row) : null;
    }

    async findByRfc(rfc: string): Promise<Client | null> {
        const [rows] = await this.pool.query('SELECT * FROM clients WHERE rfc = ?', [rfc]);
        const row = (rows as ClientRow[])[0];
        return row ? mapRowToClient(row) : null;
    }

    async updateStatus(id: number, status: 'approved'): Promise<Client | null> {
        await this.pool.query('UPDATE clients SET status = ? WHERE id = ?', [status, id]);
        return this.findById(id);
    }
}