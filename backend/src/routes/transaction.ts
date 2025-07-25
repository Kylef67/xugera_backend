import express from "express";
import transaction from "../controllers/transaction";
import { validate } from "../middleware/validate";
import { transactionSchema } from "../validation/schemas";

const router = express.Router();

router.post('/transaction', validate(transactionSchema.create, 'body'), transaction.post);
router.get('/transaction', validate(transactionSchema.query, 'query'), transaction.all);
router.get('/transaction/:id', transaction.get);
router.put('/transaction/:id', validate(transactionSchema.update, 'body'), transaction.update);
router.delete('/transaction/:id', transaction.delete);
// Sync endpoints for offline clients
router.post('/transaction/sync/pull', validate(transactionSchema.syncPull, 'body'), transaction.syncPull);
router.post('/transaction/sync/push', validate(transactionSchema.syncPush, 'body'), transaction.syncPush);

export default router;