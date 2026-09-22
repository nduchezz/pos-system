import { Router } from 'express';
import { salesReport, productsReport, inventoryReport } from '../controllers/report.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/sales', salesReport);
router.get('/products', productsReport);
router.get('/inventory', inventoryReport);

export default router;
