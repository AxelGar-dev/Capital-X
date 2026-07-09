import { describe, it, expect, beforeEach } from 'vitest';
import { ClientService } from './clientService.js';
import { InMemoryClientRepository } from '../repositories/inMemoryClientRepository.js';
import { AppError } from '../errors/appError.js';

describe('ClientService', () => {
  let clientService: ClientService;

  beforeEach(() => {
    clientService = new ClientService(new InMemoryClientRepository());
  });

  describe('create', () => {
    it('creates a client with pending status', async () => {
      const client = await clientService.create({
        businessName: 'Comercializadora ABC',
        rfc: 'ABC850315XY1',
        email: 'contacto@abc.com',
      });

      expect(client.status).toBe('pending');
      expect(client.rfc).toBe('ABC850315XY1');
    });

    it('throws 400 for an invalid RFC', async () => {
      await expect(
        clientService.create({ businessName: 'ABC', rfc: 'INVALID', email: 'a@a.com' })
      ).rejects.toThrow(AppError);
    });

    it('throws 400 for an invalid email', async () => {
      await expect(
        clientService.create({ businessName: 'ABC', rfc: 'ABC850315XY1', email: 'not-an-email' })
      ).rejects.toThrow(AppError);
    });

    it('throws 409 for a duplicate RFC', async () => {
      await clientService.create({ businessName: 'ABC', rfc: 'ABC850315XY1', email: 'a@a.com' });

      await expect(
        clientService.create({ businessName: 'XYZ', rfc: 'abc850315xy1', email: 'b@b.com' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('approve', () => {
    it('changes status from pending to approved', async () => {
      const created = await clientService.create({
        businessName: 'ABC',
        rfc: 'ABC850315XY1',
        email: 'a@a.com',
      });

      const approved = await clientService.approve(created.id);
      expect(approved.status).toBe('approved');
    });

    it('throws 404 for a non-existent client', async () => {
      await expect(clientService.approve(999)).rejects.toThrow(AppError);
    });

    it('throws 409 when approving an already-approved client', async () => {
      const created = await clientService.create({
        businessName: 'ABC',
        rfc: 'ABC850315XY1',
        email: 'a@a.com',
      });
      await clientService.approve(created.id);

      await expect(clientService.approve(created.id)).rejects.toThrow(AppError);
    });
  });
});