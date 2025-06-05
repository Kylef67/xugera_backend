import { Request, Response } from "express";
import Category from "../models/category";
import Transaction from "../models/transaction";
import mongoose from "mongoose";
import { translate } from "../localization";

// Define interfaces for proper typing
interface ICategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  parent?: mongoose.Types.ObjectId | null;
}

export default {
  post: async (req: Request, res: Response): Promise<void> => {
    try {
      const category = new Category(req.body);
      await category.save();
      res.status(201).json({
        data: category,
        message: translate('categories.created_success', req.lang)
      })
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        res.status(404).json({ error: translate('categories.not_found', req.lang) });
        return;
      }
      res.json(category);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  all: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate } = req.query;
      const categories = await Category.find();
      
      // Create date filter for transactions
      const dateFilter: any = {};
      
      if (fromDate) {
        dateFilter.$gte = new Date(fromDate as string);
      }
      
      if (toDate) {
        const toDateObj = new Date(toDate as string);
        toDateObj.setHours(23, 59, 59, 999);
        dateFilter.$lte = toDateObj;
      }
      
      // Get transaction data for all categories
      const categoriesWithTransactions = await Promise.all(
        categories.map(async (category) => {
          const categoryId = new mongoose.Types.ObjectId(category._id as unknown as string);
          
          // Get all transactions in this category
          const transactionSum = await Transaction.aggregate([
            { 
              $match: { 
                category: categoryId,
                ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
              } 
            },
            { $group: { 
                _id: null, 
                total: { $sum: "$amount" },
                count: { $sum: 1 }
              } 
            }
          ]);
          
          // Get all subcategories to include them in the totals
          const subcategories = await Category.find({ parent: category._id }) as ICategory[];
          
          // If there are subcategories, get their transactions too
          let subcategoryTotals = { total: 0, count: 0 };
          
          if (subcategories.length > 0) {
            const subcategoryIds = subcategories.map(subcat => 
              new mongoose.Types.ObjectId(subcat._id.toString())
            );
            
            const subcategorySum = await Transaction.aggregate([
              { 
                $match: { 
                  category: { $in: subcategoryIds },
                  ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
                } 
              },
              { $group: { 
                  _id: null, 
                  total: { $sum: "$amount" },
                  count: { $sum: 1 }
                } 
              }
            ]);
            
            if (subcategorySum.length > 0) {
              subcategoryTotals = {
                total: subcategorySum[0].total,
                count: subcategorySum[0].count
              };
            }
          }
          
          // Calculate the totals
          const directTotal = transactionSum.length > 0 ? transactionSum[0].total : 0;
          const directCount = transactionSum.length > 0 ? transactionSum[0].count : 0;
          
          return {
            ...category.toObject(),
            transactions: {
              direct: {
                total: directTotal,
                count: directCount
              },
              subcategories: {
                total: subcategoryTotals.total,
                count: subcategoryTotals.count
              },
              all: {
                total: directTotal + subcategoryTotals.total,
                count: directCount + subcategoryTotals.count
              }
            }
          };
        })
      );
      
      res.json(categoriesWithTransactions);
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
        res.status(404).json({ error: translate('categories.not_found', req.lang) });
        return;
      }
      res.json(category);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const subcategories = await Category.find({ parent: req.params.id });
      if (subcategories.length > 0) {
        res.status(400).json({ 
          error: translate('categories.cannot_delete_with_subcategories', req.lang)
        });
        return;
      }

      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) {
        res.status(404).json({ error: translate('categories.not_found', req.lang) });
        return;
      }
      res.json({ message: translate('categories.deleted_success', req.lang) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  getSubcategories: async (req: Request, res: Response): Promise<void> => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        res.status(404).json({ error: translate('categories.not_found', req.lang) });
        return;
      }
      
      const subcategories = await Category.find({ parent: category._id });
      res.json(subcategories);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  getRootCategories: async (_req: Request, res: Response): Promise<void> => {
    try {
      const rootCategories = await Category.find({ parent: null });
      res.json(rootCategories);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  getCategoryTransactions: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate } = req.query;
      const categoryId = req.params.id;
      
      // First verify the category exists
      const category = await Category.findById(categoryId);
      if (!category) {
        res.status(404).json({ error: translate('categories.not_found', req.lang) });
        return;
      }

      // Create date filter if needed
      const dateFilter: any = {};
      
      if (fromDate) {
        dateFilter.$gte = new Date(fromDate as string);
      }
      
      if (toDate) {
        const toDateObj = new Date(toDate as string);
        toDateObj.setHours(23, 59, 59, 999);
        dateFilter.$lte = toDateObj;
      }

      // Create match conditions for the aggregation
      const dateCondition = Object.keys(dateFilter).length > 0 
        ? { transactionDate: dateFilter } 
        : {};

      // Get all transactions in this category with optional date filtering
      const transactionSum = await Transaction.aggregate([
        { 
          $match: { 
            category: new mongoose.Types.ObjectId(categoryId),
            ...dateCondition
          } 
        },
        { $group: { 
            _id: null, 
            total: { $sum: "$amount" },
            count: { $sum: 1 }
          } 
        }
      ]);

      // Get all subcategories to include them in the totals
      const subcategories = await Category.find({ parent: categoryId }) as ICategory[];
      
      // If there are subcategories, get their transactions too
      let subcategoryTotals = { total: 0, count: 0 };
      
      if (subcategories.length > 0) {
        const subcategoryIds = subcategories.map(subcat => 
          new mongoose.Types.ObjectId(subcat._id.toString())
        );
        
        const subcategorySum = await Transaction.aggregate([
          { 
            $match: { 
              category: { $in: subcategoryIds },
              ...dateCondition
            } 
          },
          { $group: { 
              _id: null, 
              total: { $sum: "$amount" },
              count: { $sum: 1 }
            } 
          }
        ]);
        
        if (subcategorySum.length > 0) {
          subcategoryTotals = {
            total: subcategorySum[0].total,
            count: subcategorySum[0].count
          };
        }
      }

      // Calculate the totals
      const directTotal = transactionSum.length > 0 ? transactionSum[0].total : 0;
      const directCount = transactionSum.length > 0 ? transactionSum[0].count : 0;
      
      res.json({
        category: {
          _id: category._id,
          name: category.name
        },
        transactions: {
          direct: {
            total: directTotal,
            count: directCount
          },
          subcategories: {
            total: subcategoryTotals.total,
            count: subcategoryTotals.count
          },
          all: {
            total: directTotal + subcategoryTotals.total,
            count: directCount + subcategoryTotals.count
          }
        }
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}; 