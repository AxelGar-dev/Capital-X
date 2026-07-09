export type ClientStatus = 'pending' | 'approved';

export interface Client {
    id: number;
    businessName: string;
    rfc: string;
    email: string;
    status: ClientStatus;
    createdAt: Date;
}

export type NewClient = Pick<Client, 'businessName' | 'rfc' | 'email'>;