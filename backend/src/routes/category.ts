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
router.put("/category/:id", validate(categorySchema.update, 'body'), category.update);
router.delete("/category/:id", category.delete);

export default router; 