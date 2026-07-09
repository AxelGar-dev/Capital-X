import type { Request, Response } from "express";
import type { ClientService } from "../services/clientService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../errors/appError.js";

function isBlank(value: unknown): boolean {
    return typeof value !== 'string' || value.trim().length === 0;
}

export function buildClientController(clientService: ClientService) {
    const create = asyncHandler(async (req: Request, res: Response) => {
        const { businessName, rfc, email } = req.body;

        if (isBlank(businessName) || isBlank(rfc) || isBlank(email)) {
            throw new AppError(400, 'Los campos razon_social, rfc y email son obligatorios.');
        }

        const client = await clientService.create({ businessName, rfc, email });
        res.status(201).json(client);
    });

    const approve = asyncHandler(async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        if(Number.isNaN(id)) {
            throw new AppError(400, 'El id del cliente debe ser un número válido.');
        }

        const client = await clientService.approve(id);
        res.status(200).json(client);
    });

    return { create, approve }
}