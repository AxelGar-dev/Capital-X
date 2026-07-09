import { Router } from "express";
import { buildClientController } from "../controllers/clientController.js";
import type { ClientService } from "../services/clientService.js";

export function buildClientRoutes(clientService: ClientService): Router {
    const router = Router();
    const controller = buildClientController(clientService);

    router.post('/clients', controller.create);
    router.patch('/clients/:id/approve', controller.approve);

    return router;
}