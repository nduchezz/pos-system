import { Router } from 'express';
import {
  listMovements,
  productHistory,
  inventorySummary,
} from '../controllers/stock.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/movements', listMovements);
router.get('/movements/product/:productId', productHistory);
router.get('/summary', inventorySummary);

export default router;
