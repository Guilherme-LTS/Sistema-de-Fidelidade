import { Router } from 'express';
import auditRoutes from './admin.audit.routes';
import usersRoutes from './admin.users.routes';
import settingsRoutes from './admin.settings.routes';

const router = Router();

router.use(auditRoutes);
router.use(usersRoutes);
router.use(settingsRoutes);

export default router;
