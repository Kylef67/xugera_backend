import { Request, Response } from "express";
import Transaction from "../models/transaction";
import { translate } from "../localization";
import mongoose from "mongoose";

export default {
  post: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = new Transaction(req.body);
      await transaction.save();
      
      res.status(201).json({
        data: transaction,
        message: translate('transactions.created_success', req.lang)
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  all: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromAccount, toAccount, fromDate, toDate, category } = req.query;
      
      const filter: any = {};
      
      if (fromAccount) {
        filter.fromAccount = fromAccount;
      }
      
      if (toAccount) {
        filter.toAccount = toAccount;
      }

      if (category) {
        filter.category = category;
      }
      
      if (fromDate || toDate) {
        filter.transactionDate = {};
        
        if (fromDate) {
          const fromDateStr = fromDate as string;
          let fromDateObj: Date;
          
          if (fromDateStr.includes(' ')) {
            const [datePart, timePart] = fromDateStr.split(' ');
            const [hours, minutes] = timePart.split(':').map(Number);
            
            fromDateObj = new Date(datePart);
            fromDateObj.setHours(hours, minutes, 0, 0);
          } else {
            fromDateObj = new Date(fromDateStr);
            fromDateObj.setHours(0, 0, 0, 0);
          }
          
          filter.transactionDate.$gte = fromDateObj;
        }
        
        if (toDate) {
          const toDateStr = toDate as string;
          let toDateObj: Date;
          
          if (toDateStr.includes(' ')) {
            const [datePart, timePart] = toDateStr.split(' ');
            const [hours, minutes] = timePart.split(':').map(Number);
            
            toDateObj = new Date(datePart);
            toDateObj.setHours(hours, minutes, 59, 999);
          } else {
            toDateObj = new Date(toDateStr);
            toDateObj.setHours(23, 59, 59, 999);
          }
          
          filter.transactionDate.$lte = toDateObj;
        }
      }
      
      const transactions = await Transaction.find(filter)
        .populate("fromAccount")
        .populate("toAccount")
        .populate("category");
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await Transaction.findById(req.params.id)
        .populate("fromAccount")
        .populate("toAccount")
        .populate("category");
        
      if (!transaction) {
        res.status(404).json({ 
          error: translate('transactions.not_found', req.lang)
        });
        return;
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await Transaction.findByIdAndUpdate(
        req.params.id,
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
        data: transaction,
        message: translate('transactions.updated_success', req.lang)
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await Transaction.findByIdAndDelete(req.params.id);
      
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
              ...dateCondition
            } 
          },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        Transaction.aggregate([
          { 
            $match: { 
              fromAccount: new mongoose.Types.ObjectId(accountId),
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
