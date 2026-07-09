import type { Request, Response } from "express";
import type { ClientService } from "../services/clientService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../errors/appError.js";

export function buildClientController(clientService: ClientService) {
    const create = asyncHandler(async (req: Request, res: Response) => {
        const client = await clientService.create(req.body);
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