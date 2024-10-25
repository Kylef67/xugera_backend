import express from "express";
import account from "../controllers/account";

const router = express.Router();

router.post("/account", account.post);
router.get("/account", account.all);
router.get("/account/:id", account.get);
router.put("/account/:id", account.update);
router.delete("/account/:id", account.delete);

export default router;
