import express from "express";
import transaction from "../controllers/transaction"

const router = express.Router()

router.post('/transaction', transaction.post);
router.get('/transaction', transaction.all);
router.get('/transaction/:id', transaction.get);
router.put('/transaction/:id', transaction.update);
router.delete('/transaction/:id', transaction.delete);

export default router