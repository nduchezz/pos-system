import { Router } from 'express';
import { dashboard, dashboardChart } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', dashboard);
router.get('/chart', dashboardChart);

export default router;
