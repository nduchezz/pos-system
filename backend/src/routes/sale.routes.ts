import { Router } from 'express';
import { createSale, listSales, getSale } from '../controllers/sale.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createSale);
router.get('/', listSales);
router.get('/:id', getSale);

export default router;
