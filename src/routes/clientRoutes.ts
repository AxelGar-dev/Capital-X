import { Router } from "express";
import { buildClientController } from "../controllers/clientController.js";
import type { ClientService } from "../services/clientService.js";
import type { OperationService } from "../services/operationService.js";

export function buildClientRoutes(clientService: ClientService, operationService: OperationService): Router {
    const router = Router();
    const controller = buildClientController(clientService, operationService);

    router.post('/', controller.create);
    router.patch('/:id/approve', controller.approve);
    router.get('/:id/resume', controller.getSummary);

    return router;
}