import express from "express";
import category from "../controllers/category";

const router = express.Router();

router.post("/category", category.post);
router.get("/category", category.all);
router.get("/category/root", category.getRootCategories);
router.get("/category/:id", category.get);
router.get("/category/:id/subcategories", category.getSubcategories);
router.put("/category/:id", category.update);
router.delete("/category/:id", category.delete);

export default router; 