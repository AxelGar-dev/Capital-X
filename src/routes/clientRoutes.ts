import { Router } from "express";
import { buildClientController } from "../controllers/clientController.js";
import type { ClientService } from "../services/clientService.js";

export function buildClientRoutes(clientService: ClientService): Router {
    const router = Router();
    const controller = buildClientController(clientService);

    router.post('/clientes', controller.create);
    router.patch('/clientes/:id/aprobar', controller.approve);

    return router;
}