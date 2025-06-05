import { Request, Response } from "express";
import Account from "../models/account";
import Transaction from "../models/transaction";
import mongoose from "mongoose";
import { translate } from "../localization";

export default {
  post: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = new Account(req.body);
      await account.save();
      res.status(201).json({
        data: account,
        message: translate('accounts.created_success', req.lang)
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate } = req.query;
      const account = await Account.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: translate('accounts.not_found', req.lang) });
        return;
      }

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

      // Convert ID to ObjectId
      const accountId = new mongoose.Types.ObjectId(req.params.id);

      // Run two aggregations in parallel for incoming and outgoing transactions
      const [incomingSum, outgoingSum] = await Promise.all([
        Transaction.aggregate([
          { 
            $match: { 
              toAccount: accountId,
              ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
            } 
          },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        Transaction.aggregate([
          { 
            $match: { 
              fromAccount: accountId,
              ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
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
        account,
        transactions: {
          balance,
          totalIncoming,
          totalOutgoing
        }
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  all: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate } = req.query;
      const accounts = await Account.find();
      
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
      
      // Get transaction data for all accounts
      const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => {
          const accountId = new mongoose.Types.ObjectId(account._id as unknown as string);
          
          // Run two aggregations in parallel for incoming and outgoing transactions
          const [incomingSum, outgoingSum] = await Promise.all([
            Transaction.aggregate([
              { 
                $match: { 
                  toAccount: accountId,
                  ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
                } 
              },
              { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            Transaction.aggregate([
              { 
                $match: { 
                  fromAccount: accountId,
                  ...(Object.keys(dateFilter).length > 0 ? { transactionDate: dateFilter } : {})
                } 
              },
              { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
          ]);
          
          // Calculate total balance from transactions
          const totalIncoming = incomingSum.length > 0 ? incomingSum[0].total : 0;
          const totalOutgoing = outgoingSum.length > 0 ? outgoingSum[0].total : 0;
          const balance = totalIncoming - totalOutgoing;
          
          return {
            ...account.toObject(),
            transactions: {
              balance,
              totalIncoming,
              totalOutgoing
            }
          };
        })
      );
      
      res.json(accountsWithBalances);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await Account.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!account) {
        res.status(404).json({ error: translate('accounts.not_found', req.lang) });
        return;
      }
      res.json(account);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await Account.findByIdAndDelete(req.params.id);
      if (!account) {
        res.status(404).json({ error: translate('accounts.not_found', req.lang) });
        return;
      }
      res.json({ message: translate('accounts.deleted_success', req.lang) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
};
