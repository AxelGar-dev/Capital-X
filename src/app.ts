import 'dotenv/config';
import express from 'express';
import { pool } from './config/db.js';
import { MysqlClientRepository } from './repositories/mysqlClientRepository.js';
import { ClientService } from './services/clientService.js';
import { buildClientRoutes } from './routes/clientRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(express.json());

const clientRepository = new MysqlClientRepository(pool);
const clientService = new ClientService(clientRepository);

app.use('/', buildClientRoutes(clientService));
app.use(errorHandler);

export default app;
