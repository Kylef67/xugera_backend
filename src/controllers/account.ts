import { Request, Response } from "express";
import Account from "../models/account";

export default {
  post: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = new Account(req.body);
      await account.save();
      res.status(201).json(account);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await Account.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
      }
      res.json(account);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  all: async (req: Request, res: Response): Promise<void> => {
    try {
      const accounts = await Account.find();
      res.json(accounts);
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
        res.status(404).json({ error: "Account not found" });
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
        res.status(404).json({ error: "Account not found" });
        return;
      }
      res.json({ message: "Account deleted" });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
};
