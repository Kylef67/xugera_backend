import { Request, Response } from "express";
import Transaction from "../models/transaction";

export default {
  post: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = new Transaction(req.body);
      await transaction.save();
      res.status(201).json(transaction);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  all: async (req: Request, res: Response): Promise<void> => {
    try {
      const { account, fromDate, toDate } = req.query;
      
      const filter: any = {};
      
      if (account) {
        filter.account = account;
      }
      
      if (fromDate || toDate) {
        filter.transactionDate = {};
        
        if (fromDate) {
          try {
            const fromDateStr = fromDate as string;
            let fromDateObj: Date;
            
            // Check if the date includes time component
            if (fromDateStr.includes(' ')) {
              // Format: "YYYY-MM-DD HH:MM"
              const [datePart, timePart] = fromDateStr.split(' ');
              
              if (!timePart.match(/^\d{1,2}:\d{2}$/)) {
                res.status(400).json({ error: "Invalid time format in fromDate. Use 'YYYY-MM-DD HH:MM' format" });
                return;
              }
              
              const [hours, minutes] = timePart.split(':').map(Number);
              if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                res.status(400).json({ error: "Invalid time values in fromDate. Hours must be 0-23, minutes 0-59" });
                return;
              }
              
              fromDateObj = new Date(datePart);
              fromDateObj.setHours(hours, minutes, 0, 0);
            } else {
              // Format: "YYYY-MM-DD" (set to start of day)
              fromDateObj = new Date(fromDateStr);
              fromDateObj.setHours(0, 0, 0, 0);
            }
            
            if (isNaN(fromDateObj.getTime())) {
              res.status(400).json({ error: "Invalid fromDate format. Use 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM'" });
              return;
            }
            
            filter.transactionDate.$gte = fromDateObj;
          } catch (error) {
            res.status(400).json({ error: "Invalid fromDate format. Use 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM'" });
            return;
          }
        }
        
        if (toDate) {
          try {
            const toDateStr = toDate as string;
            let toDateObj: Date;
            
            // Check if the date includes time component
            if (toDateStr.includes(' ')) {
              // Format: "YYYY-MM-DD HH:MM"
              const [datePart, timePart] = toDateStr.split(' ');
              
              if (!timePart.match(/^\d{1,2}:\d{2}$/)) {
                res.status(400).json({ error: "Invalid time format in toDate. Use 'YYYY-MM-DD HH:MM' format" });
                return;
              }
              
              const [hours, minutes] = timePart.split(':').map(Number);
              if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                res.status(400).json({ error: "Invalid time values in toDate. Hours must be 0-23, minutes 0-59" });
                return;
              }
              
              toDateObj = new Date(datePart);
              toDateObj.setHours(hours, minutes, 59, 999);
            } else {
              // Format: "YYYY-MM-DD" (set to end of day)
              toDateObj = new Date(toDateStr);
              toDateObj.setHours(23, 59, 59, 999);
            }
            
            if (isNaN(toDateObj.getTime())) {
              res.status(400).json({ error: "Invalid toDate format. Use 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM'" });
              return;
            }
            
            filter.transactionDate.$lte = toDateObj;
          } catch (error) {
            res.status(400).json({ error: "Invalid toDate format. Use 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM'" });
            return;
          }
        }
      }
      
      const transactions = await Transaction.find(filter).populate("account");
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await Transaction.findById(req.params.id);
      if (!transaction) {
        res.status(404).json({ error: "Transaction not found" });
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
      );
      if (!transaction) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }
      res.json(transaction);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await Transaction.findByIdAndDelete(req.params.id);
      if (!transaction) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      } 
      res.json({ message: "Transaction deleted" });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
};
