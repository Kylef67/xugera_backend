import { Request, Response } from "express";
import Transaction from "../models/transaction";
import { translate } from "../localization";
import mongoose from "mongoose";
import { addSoftDeleteFilter, performSoftDelete, NOT_DELETED_FILTER } from "../utils/softDelete";

// Helper function to transform transaction object for frontend
function transformTransactionForFrontend(transaction: any): any {
  const obj = transaction.toObject();
  const transformed = {
    ...obj,
    id: transaction._id.toString(),
  };
  
  // Handle populated fields - convert _id to id
  if (transformed.fromAccount && typeof transformed.fromAccount === 'object' && transformed.fromAccount._id) {
    transformed.fromAccount = {
      ...transformed.fromAccount,
      id: transformed.fromAccount._id.toString()
    };
    delete transformed.fromAccount._id;
    delete transformed.fromAccount.__v;
  }
  
  if (transformed.toAccount && typeof transformed.toAccount === 'object' && transformed.toAccount._id) {
    transformed.toAccount = {
      ...transformed.toAccount,
      id: transformed.toAccount._id.toString()
    };
    delete transformed.toAccount._id;
    delete transformed.toAccount.__v;
  }
  
  if (transformed.category && typeof transformed.category === 'object' && transformed.category._id) {
    transformed.category = {
      ...transformed.category,
      id: transformed.category._id.toString()
    };
    delete transformed.category._id;
    delete transformed.category.__v;
  }
  
  delete transformed._id;
  delete transformed.__v;
  return transformed;
}

export default {
  post: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = new Transaction(req.body);
      await transaction.save();
      
      res.status(201).json({
        data: transformTransactionForFrontend(transaction),
        message: translate('transactions.created_success', req.lang)
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  all: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromAccount, toAccount, fromDate, toDate, category } = req.query;
      
      let filter: any = {};
      
      if (fromAccount) {
        filter.fromAccount = fromAccount;
      }
      
      if (toAccount) {
        filter.toAccount = toAccount;
      }

      if (category) {
        filter.category = category;
      }

      // Add soft delete filter
      filter = addSoftDeleteFilter(filter);
      
      if (fromDate || toDate) {
        filter.transactionDate = {};
        
        if (fromDate) {
          const fromDateStr = fromDate as string;
          let fromDateObj: Date;
          
          if (fromDateStr.includes(' ')) {
            // Handle datetime strings - parse as ISO string directly
            fromDateObj = new Date(fromDateStr);
          } else {
            // Handle date-only strings - parse as ISO string directly
            fromDateObj = new Date(fromDateStr);
          }
          
          filter.transactionDate.$gte = fromDateObj;
        }
        
        if (toDate) {
          const toDateStr = toDate as string;
          let toDateObj: Date;
          
          if (toDateStr.includes(' ')) {
            // Handle datetime strings - parse as ISO string directly
            toDateObj = new Date(toDateStr);
          } else {
            // Handle date-only strings - parse as ISO string directly
            toDateObj = new Date(toDateStr);
          }
          
          filter.transactionDate.$lte = toDateObj;
        }
      }
      
      const transactions = await Transaction.find(filter)
        .populate("fromAccount")
        .populate("toAccount")
        .populate("category");
      res.json(transactions.map(transformTransactionForFrontend));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await Transaction.findOne(
        addSoftDeleteFilter({ _id: req.params.id })
      )
        .populate("fromAccount")
        .populate("toAccount")
        .populate("category");
        
      if (!transaction) {
        res.status(404).json({ 
          error: translate('transactions.not_found', req.lang)
        });
        return;
      }
      res.json(transformTransactionForFrontend(transaction));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await Transaction.findOneAndUpdate(
        addSoftDeleteFilter({ _id: req.params.id }),
        req.body,
        { new: true }
      )
        .populate("fromAccount")
        .populate("toAccount")
        .populate("category");
        
      if (!transaction) {
        res.status(404).json({ 
          error: translate('transactions.not_found', req.lang) 
        });
        return;
      }
      
      res.json({
        data: transformTransactionForFrontend(transaction),
        message: translate('transactions.updated_success', req.lang)
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await performSoftDelete(Transaction, req.params.id);
      
      if (!transaction) {
        res.status(404).json({ 
          error: translate('transactions.not_found', req.lang) 
        });
        return;
      } 
      
      res.json({ 
        message: translate('transactions.deleted_success', req.lang) 
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  sumByAccount: async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId, fromDate, toDate } = req.params;

      const dateFilter: any = {};
      
      if (fromDate) {
        dateFilter.$gte = new Date(fromDate);
      }
      
      if (toDate) {
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        dateFilter.$lte = toDateObj;
      }

      // Create match conditions for the aggregation
      const dateCondition = Object.keys(dateFilter).length > 0 
        ? { transactionDate: dateFilter } 
        : {};

      // Run two aggregations in parallel for incoming and outgoing transactions
      const [incomingSum, outgoingSum] = await Promise.all([
        Transaction.aggregate([
          { 
            $match: { 
              toAccount: new mongoose.Types.ObjectId(accountId),
              isDeleted: { $ne: true }, // Filter out soft-deleted transactions
              ...dateCondition
            } 
          },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        Transaction.aggregate([
          { 
            $match: { 
              fromAccount: new mongoose.Types.ObjectId(accountId),
              isDeleted: { $ne: true }, // Filter out soft-deleted transactions
              ...dateCondition
            } 
          },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ])
      ]);

      // Calculate total balance from transactions
      const totalIncoming = incomingSum.length > 0 ? incomingSum[0].total : 0;
      const totalOutgoing = outgoingSum.length > 0 ? outgoingSum[0].total : 0;
      const balance = totalIncoming - totalOutgoing;

      res.json({
        transactions: {
          balance,
          totalIncoming,
          totalOutgoing
        }
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
};
