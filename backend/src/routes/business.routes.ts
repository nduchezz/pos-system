import { Router } from 'express';
import { getBusiness, updateBusiness } from '../controllers/business.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getBusiness);
router.put('/', requireRole('ADMIN'), updateBusiness);

export default router;
