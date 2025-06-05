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

export default router;
