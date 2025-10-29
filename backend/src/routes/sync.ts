import { Router } from 'express';
import syncController from '../controllers/sync';

const router = Router();

// Get changes since last sync
router.get('/changes', syncController.getChanges);

// Push offline operations to server
router.post('/push', syncController.pushChanges);

// Get sync status
router.get('/status', syncController.getStatus);

export default router;
