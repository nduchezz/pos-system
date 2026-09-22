import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  lowStockProducts,
} from '../controllers/product.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', listProducts);
router.get('/low-stock', lowStockProducts);
router.get('/:id', getProduct);
router.post('/', requireRole('ADMIN'), createProduct);
router.put('/:id', requireRole('ADMIN'), updateProduct);
router.delete('/:id', requireRole('ADMIN'), deleteProduct);
router.patch('/:id/stock', adjustStock);

export default router;
