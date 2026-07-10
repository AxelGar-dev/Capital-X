import { Router } from 'express';
import { buildOperationController } from '../controllers/operationController.js';
import type { OperationService } from '../services/operationService.js';

export function buildOperationRoutes(operationService: OperationService): Router {
    const router = Router();
    const controller = buildOperationController(operationService);

    router.post('/', controller.create);

    return router;
}