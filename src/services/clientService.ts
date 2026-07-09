import type { Client, NewClient } from '../models/client.js';
import type { ClientRepository } from '../repositories/clientRepository.js';
import { validateRfc, normalizeRfc } from '../validators/rfcValidator.js';
import { validateEmail } from '../validators/emailValidator.js';
import { AppError } from '../errors/appError.js';

export class ClientService {
    constructor(private readonly clientRepository: ClientRepository) {}

    async create(input: NewClient): Promise<Client> {
        const { businessName, rfc, email } = input;
        const isRfcValid = validateRfc(rfc);
        const isEmailValid = validateEmail(email);

        if(!isRfcValid.valid) throw new AppError(400, isRfcValid.reason!);
        if(!isEmailValid.valid) throw new AppError(400, isEmailValid.reason!);

        const newRfc = normalizeRfc(rfc);

        const existingClient = await this.clientRepository.findByRfc(newRfc)

        if(existingClient) throw new AppError(409, 'Ya existe un cliente registrado con este RFC. Si esta es tu empresa, contacta soporte.');

        return this.clientRepository.create({ businessName, rfc: newRfc, email });
    }

    async approve(id: number): Promise<Client> {
        const client: Client | null = await this.clientRepository.findById(id);
        if(client === null) throw new AppError(404, 'No se encontró un cliente con ese id.');

        if(client.status === 'approved') throw new AppError(409, 'Este cliente ya se encuentra aprobado');

        const updatedClient = await this.clientRepository.updateStatus(id, 'approved');
        return updatedClient!;
    }
}