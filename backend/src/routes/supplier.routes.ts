import { Router } from 'express';
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplier.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listSuppliers);
router.get('/:id', getSupplier);
router.post('/', createSupplier);
router.put('/:id', requireRole('ADMIN'), updateSupplier);
router.delete('/:id', requireRole('ADMIN'), deleteSupplier);

export default router;
