import { Router } from 'express';
import {
  listUsers, createUser, updateUser, changePassword, deleteUser,
} from '../controllers/user.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/password', changePassword);
router.delete('/:id', deleteUser);

export default router;
