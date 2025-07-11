import express from "express";
import account from "../controllers/account";
import { validate } from "../middleware/validate";
import { accountSchema } from "../validation/schemas";

const router = express.Router();

router.post("/account", validate(accountSchema.create, 'body'), account.post);
router.get("/account", account.all);
router.get("/account/:id", account.get);
router.put("/account/:id", validate(accountSchema.update, 'body'), account.update);
router.delete("/account/:id", account.delete);
router.post("/account/order", validate(accountSchema.updateOrder, 'body'), account.updateOrder);
router.post("/account/sync/pull", account.syncPull);
router.post("/account/sync/push", account.syncPush);

export default router;
