import express from "express";
import category from "../controllers/category";
import { validate } from "../middleware/validate";
import { categorySchema } from "../validation/schemas";

const router = express.Router();

router.post("/category", validate(categorySchema.create, 'body'), category.post);
router.get("/category", category.all);
router.get("/category/root", category.getRootCategories);
router.get("/category/:id", category.get);
router.get("/category/:id/subcategories", category.getSubcategories);
router.get("/category/:id/transactions", category.getCategoryTransactions);
router.put("/category/:id", validate(categorySchema.update, 'body'), category.update);
router.delete("/category/:id", category.delete);
// Update order of categories
router.post("/category/order", validate(categorySchema.update, 'body'), category.updateOrder);
// Sync endpoints for offline clients
router.post("/category/sync/pull", category.syncPull);
router.post("/category/sync/push", category.syncPush);

export default router; 