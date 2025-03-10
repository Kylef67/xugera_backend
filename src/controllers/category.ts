import { Request, Response } from "express";
import Category from "../models/category";
import mongoose from "mongoose";

export default {
  post: async (req: Request, res: Response): Promise<void> => {
    try {
      const category = new Category(req.body);
      await category.save();
      res.status(201).json(category);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      res.json(category);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  all: async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = await Category.find();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      res.json(category);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if there are any subcategories
      const subcategories = await Category.find({ parent: req.params.id });
      if (subcategories.length > 0) {
        res.status(400).json({ 
          error: "Cannot delete category with subcategories. Delete subcategories first or reassign them." 
        });
        return;
      }

      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      res.json({ message: "Category deleted" });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  // Get subcategories for a specific category
  getSubcategories: async (req: Request, res: Response): Promise<void> => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      
      // Find all categories with this category as parent
      const subcategories = await Category.find({ parent: category._id });
      res.json(subcategories);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  // Get all root categories (categories without parents)
  getRootCategories: async (_req: Request, res: Response): Promise<void> => {
    try {
      const rootCategories = await Category.find({ parent: null });
      res.json(rootCategories);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}; 