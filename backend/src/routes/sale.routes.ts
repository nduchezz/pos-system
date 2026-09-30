import { Router } from 'express';
import { createSale, listSales, getSale } from '../controllers/sale.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { saleLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(authenticate);

router.post('/', saleLimiter, createSale);
router.get('/', listSales);
router.get('/:id', getSale);

export default router;
