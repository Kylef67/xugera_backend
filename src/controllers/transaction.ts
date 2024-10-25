import { Request, Response } from "express";
import Transaction from "../models/transaction";

export default {
  post: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = new Transaction(req.body);
      transaction.save();
      res.status(201).json(transaction);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  all: async (req: Request, res: Response): Promise<void> => {
    try {
      const transactions = await Transaction.find().populate("account");
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await Transaction.findById(req.params.id);
      res.json(transaction);
    } catch (error) {
      res.status(500).json(error);
    }
  },
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await Transaction.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return
      }
      res.json(account);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await Transaction.findByIdAndDelete(req.params.id);
      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return
      } 
      res.json({ message: "Account deleted" });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
};
