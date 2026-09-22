import { Router } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', listCategories);
router.get('/:id', getCategory);
router.post('/', requireRole('ADMIN'), createCategory);
router.put('/:id', requireRole('ADMIN'), updateCategory);
router.delete('/:id', requireRole('ADMIN'), deleteCategory);

export default router;
