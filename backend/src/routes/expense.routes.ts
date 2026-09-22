import { Router } from 'express';
import {
  listExpenses, getExpense, createExpense, updateExpense, deleteExpense,
} from '../controllers/expense.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', listExpenses);
router.get('/:id', getExpense);
router.post('/', createExpense);
router.put('/:id', requireRole('ADMIN'), updateExpense);
router.delete('/:id', requireRole('ADMIN'), deleteExpense);

export default router;
