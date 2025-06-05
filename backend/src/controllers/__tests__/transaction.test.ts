jest.mock('../../models/transaction');
jest.mock('../../localization');

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import transactionController from '../../controllers/transaction';

import Transaction from '../../models/transaction';
import * as localization from '../../localization';

const mockSave = jest.fn();
const mockTransactionInstance = { save: mockSave };

const mockTranslations: Record<string, any> = {
  transactions: {
    created_success: 'Transaction created successfully',
    updated_success: 'Transaction updated successfully',
    deleted_success: 'Transaction deleted successfully',
    not_found: 'Transaction not found'
  }
};

describe('Transaction Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    ((Transaction as unknown) as jest.Mock).mockImplementation(() => mockTransactionInstance);
    
    (Transaction as any).find = jest.fn();
    (Transaction as any).findById = jest.fn();
    (Transaction as any).findByIdAndUpdate = jest.fn();
    (Transaction as any).findByIdAndDelete = jest.fn();
    (Transaction as any).aggregate = jest.fn();
    
    ((localization.translate as unknown) as jest.Mock).mockImplementation(
      (key, lang) => {
        const keys = key.split('.');
        let value: any = mockTranslations;
        
        for (const k of keys) {
          if (!value || typeof value !== 'object') {
            return key;
          }
          value = value[k];
        }
        
        return typeof value === 'string' ? value : key;
      }
    );
    
    ((localization.getTranslations as unknown) as jest.Mock).mockReturnValue(mockTranslations);
    
    req = {
      body: {},
      params: {},
      query: {},
      headers: {
        'accept-language': 'en'
      },
      lang: 'en'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    jest.clearAllMocks();
  });

  describe('post', () => {
    it('should create a new transaction', async () => {
      req.body = {
        transactionDate: new Date(),
        fromAccount: '123',
        toAccount: '456',
        category: '789',
        amount: 100
      };
      
      mockSave.mockResolvedValue(mockTransactionInstance);
      
      await transactionController.post(req as Request, res as Response);
      
      expect(Transaction).toHaveBeenCalledWith(req.body);
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: mockTransactionInstance,
        message: 'Transaction created successfully'
      });
      expect(localization.translate).toHaveBeenCalledWith('transactions.created_success', 'en');
    });

    it('should handle errors when creating a transaction', async () => {
      req.body = {
        transactionDate: new Date(),
        fromAccount: '123',
        toAccount: '456',
        category: '789',
        amount: 100
      };
      
      const errorMessage = 'Validation failed';
      mockSave.mockRejectedValue(new Error(errorMessage));
      
      await transactionController.post(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('all', () => {
    it('should return all transactions', async () => {
      const mockTransactions = [
        { 
          _id: '123', 
          transactionDate: new Date(), 
          fromAccount: '456', 
          toAccount: '789', 
          category: '321',
          amount: 150
        }
      ];

      // Create a proper chain of populate mocks
      const mockPopulateCategory = jest.fn().mockResolvedValue(mockTransactions);
      const mockPopulateToAccount = jest.fn().mockReturnValue({ populate: mockPopulateCategory });
      const mockPopulateFromAccount = jest.fn().mockReturnValue({ populate: mockPopulateToAccount });
      
      (Transaction as any).find.mockReturnValue({
        populate: mockPopulateFromAccount
      });
      
      await transactionController.all(req as Request, res as Response);
      
      expect((Transaction as any).find).toHaveBeenCalled();
      expect(mockPopulateFromAccount).toHaveBeenCalledWith("fromAccount");
      expect(mockPopulateToAccount).toHaveBeenCalledWith("toAccount");
      expect(mockPopulateCategory).toHaveBeenCalledWith("category");
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should handle errors when fetching all transactions', async () => {
      const errorMessage = 'Database error';
      
      (Transaction as any).find.mockImplementation(() => {
        throw new Error(errorMessage);
      });
      
      await transactionController.all(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });

    it('should filter transactions by fromAccount ID', async () => {
      req.query = { fromAccount: '123' };
      
      const mockTransactions = [
        { 
          _id: '456', 
          transactionDate: new Date(), 
          fromAccount: '123', 
          toAccount: '789', 
          category: '321',
          amount: 250
        }
      ];
      
      // Create a proper chain of populate mocks
      const mockPopulateCategory = jest.fn().mockResolvedValue(mockTransactions);
      const mockPopulateToAccount = jest.fn().mockReturnValue({ populate: mockPopulateCategory });
      const mockPopulateFromAccount = jest.fn().mockReturnValue({ populate: mockPopulateToAccount });
      
      (Transaction as any).find.mockReturnValue({
        populate: mockPopulateFromAccount
      });
      
      await transactionController.all(req as Request, res as Response);
      
      expect((Transaction as any).find).toHaveBeenCalledWith(
        expect.objectContaining({ fromAccount: '123' })
      );
      
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should filter transactions by category ID', async () => {
      req.query = { category: '321' };
      
      const mockTransactions = [
        { 
          _id: '456', 
          transactionDate: new Date(), 
          fromAccount: '123', 
          toAccount: '789', 
          category: '321',
          amount: 175
        }
      ];
      
      // Create a proper chain of populate mocks
      const mockPopulateCategory = jest.fn().mockResolvedValue(mockTransactions);
      const mockPopulateToAccount = jest.fn().mockReturnValue({ populate: mockPopulateCategory });
      const mockPopulateFromAccount = jest.fn().mockReturnValue({ populate: mockPopulateToAccount });
      
      (Transaction as any).find.mockReturnValue({
        populate: mockPopulateFromAccount
      });
      
      await transactionController.all(req as Request, res as Response);
      
      expect((Transaction as any).find).toHaveBeenCalledWith(
        expect.objectContaining({ category: '321' })
      );
      
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });

    it('should filter transactions by date range', async () => {
      req.query = { 
        fromDate: '2023-01-01',
        toDate: '2023-01-31'
      };
      
      const mockTransactions = [
        { 
          _id: '456', 
          transactionDate: new Date('2023-01-15'), 
          fromAccount: '789', 
          toAccount: '123', 
          category: '321',
          amount: 300
        }
      ];
      
      // Create a proper chain of populate mocks
      const mockPopulateCategory = jest.fn().mockResolvedValue(mockTransactions);
      const mockPopulateToAccount = jest.fn().mockReturnValue({ populate: mockPopulateCategory });
      const mockPopulateFromAccount = jest.fn().mockReturnValue({ populate: mockPopulateToAccount });
      
      (Transaction as any).find.mockReturnValue({
        populate: mockPopulateFromAccount
      });
      
      await transactionController.all(req as Request, res as Response);
      
      expect((Transaction as any).find).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
      
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });
  });

  describe('get', () => {
    it('should return a transaction by ID', async () => {
      const mockTransaction = { 
        _id: '123', 
        transactionDate: new Date(), 
        fromAccount: '456',
        toAccount: '789',
        category: '321',
        amount: 450
      };
      req.params = { id: '123' };
      
      // Create a proper chain of populate mocks for findById
      const mockPopulateCategory = jest.fn().mockResolvedValue(mockTransaction);
      const mockPopulateToAccount = jest.fn().mockReturnValue({ populate: mockPopulateCategory });
      const mockPopulateFromAccount = jest.fn().mockReturnValue({ populate: mockPopulateToAccount });
      
      (Transaction as any).findById.mockReturnValue({
        populate: mockPopulateFromAccount
      });
      
      await transactionController.get(req as Request, res as Response);
      
      expect((Transaction as any).findById).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith(mockTransaction);
    });

    it('should return 404 if transaction not found', async () => {
      req.params = { id: '123' };
      
      // Create a proper chain of populate mocks for findById with null result
      const mockPopulateCategory = jest.fn().mockResolvedValue(null);
      const mockPopulateToAccount = jest.fn().mockReturnValue({ populate: mockPopulateCategory });
      const mockPopulateFromAccount = jest.fn().mockReturnValue({ populate: mockPopulateToAccount });
      
      (Transaction as any).findById.mockReturnValue({
        populate: mockPopulateFromAccount
      });
      
      await transactionController.get(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Transaction not found' 
      });
      expect(localization.translate).toHaveBeenCalledWith('transactions.not_found', 'en');
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      req.params = { id: '123' };
      req.body = { 
        transactionDate: new Date(), 
        category: '321',
        amount: 550
      };
      
      const updatedTransaction = { 
        _id: '123', 
        transactionDate: new Date(), 
        fromAccount: '456',
        toAccount: '789',
        category: '321',
        amount: 550
      };
      
      // Create a proper chain of populate mocks for findByIdAndUpdate
      const mockPopulateCategory = jest.fn().mockResolvedValue(updatedTransaction);
      const mockPopulateToAccount = jest.fn().mockReturnValue({ populate: mockPopulateCategory });
      const mockPopulateFromAccount = jest.fn().mockReturnValue({ populate: mockPopulateToAccount });
      
      (Transaction as any).findByIdAndUpdate.mockReturnValue({
        populate: mockPopulateFromAccount
      });
      
      await transactionController.update(req as Request, res as Response);
      
      expect((Transaction as any).findByIdAndUpdate).toHaveBeenCalledWith('123', req.body, { new: true });
      expect(res.json).toHaveBeenCalledWith({
        data: updatedTransaction,
        message: 'Transaction updated successfully'
      });
      expect(localization.translate).toHaveBeenCalledWith('transactions.updated_success', 'en');
    });

    it('should return 404 if transaction not found during update', async () => {
      req.params = { id: '123' };
      req.body = { 
        transactionDate: new Date(), 
        category: '321',
        amount: 600
      };
      
      // Create a proper chain of populate mocks for findByIdAndUpdate with null result
      const mockPopulateCategory = jest.fn().mockResolvedValue(null);
      const mockPopulateToAccount = jest.fn().mockReturnValue({ populate: mockPopulateCategory });
      const mockPopulateFromAccount = jest.fn().mockReturnValue({ populate: mockPopulateToAccount });
      
      (Transaction as any).findByIdAndUpdate.mockReturnValue({
        populate: mockPopulateFromAccount
      });
      
      await transactionController.update(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Transaction not found' 
      });
      expect(localization.translate).toHaveBeenCalledWith('transactions.not_found', 'en');
    });
  });
  
  describe('delete', () => {
    it('should delete a transaction', async () => {
      const deletedTransaction = { 
        _id: '123', 
        transactionDate: new Date(), 
        fromAccount: '456',
        toAccount: '789',
        category: '321',
        amount: 325
      };
      req.params = { id: '123' };
      
      (Transaction as any).findByIdAndDelete.mockResolvedValue(deletedTransaction);
      
      await transactionController.delete(req as Request, res as Response);
      
      expect((Transaction as any).findByIdAndDelete).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'Transaction deleted successfully' 
      });
      expect(localization.translate).toHaveBeenCalledWith('transactions.deleted_success', 'en');
    });
    
    it('should return 404 if transaction not found during delete', async () => {
      req.params = { id: 'nonexistent-id' };
      
      (Transaction as any).findByIdAndDelete.mockResolvedValue(null);
      
      await transactionController.delete(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Transaction not found' 
      });
      expect(localization.translate).toHaveBeenCalledWith('transactions.not_found', 'en');
    });
  });

  describe('sumByAccount', () => {
    const validAccountId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
      req.params = { 
        accountId: validAccountId
      };
    });

    it('should return transaction sums for an account', async () => {
      // Mock the transaction aggregation results
      const mockIncomingSum = [{ _id: null, total: 1000 }];
      const mockOutgoingSum = [{ _id: null, total: 600 }];
      
      // Setup Transaction.aggregate to return different values based on the match condition
      (Transaction.aggregate as jest.MockedFunction<any>).mockImplementation((pipeline: any[]) => {
        const matchStage = pipeline[0].$match;
        
        if (matchStage.toAccount) {
          return Promise.resolve(mockIncomingSum);
        } else if (matchStage.fromAccount) {
          return Promise.resolve(mockOutgoingSum);
        }
        return Promise.resolve([]);
      });
      
      await transactionController.sumByAccount(req as Request, res as Response);
      
      expect(Transaction.aggregate).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        transactions: {
          balance: 400,  // 1000 - 600
          totalIncoming: 1000,
          totalOutgoing: 600
        }
      });
    });

    it('should handle date filtering for transaction sums', async () => {
      // Setup request with date filters
      req.params = {
        accountId: validAccountId,
        fromDate: '2023-01-01',
        toDate: '2023-01-31'
      };
      
      // Mock the transaction aggregation
      const mockIncomingSum = [{ _id: null, total: 800 }];
      const mockOutgoingSum = [{ _id: null, total: 350 }];
      
      // Setup Transaction.aggregate to return different values and verify date filters
      (Transaction.aggregate as jest.MockedFunction<any>).mockImplementation((pipeline: any[]) => {
        const matchStage = pipeline[0].$match;
        
        // Verify date range is applied correctly if present
        if (matchStage.transactionDate) {
          expect(matchStage.transactionDate.$gte instanceof Date).toBe(true);
          expect(matchStage.transactionDate.$lte instanceof Date).toBe(true);
        }
        
        if (matchStage.toAccount) {
          return Promise.resolve(mockIncomingSum);
        } else if (matchStage.fromAccount) {
          return Promise.resolve(mockOutgoingSum);
        }
        return Promise.resolve([]);
      });
      
      await transactionController.sumByAccount(req as Request, res as Response);
      
      expect(res.json).toHaveBeenCalledWith({
        transactions: {
          balance: 450,  // 800 - 350
          totalIncoming: 800,
          totalOutgoing: 350
        }
      });
    });

    it('should handle empty transaction results', async () => {
      // Mock empty transaction results
      (Transaction.aggregate as jest.MockedFunction<any>).mockResolvedValue([]);
      
      await transactionController.sumByAccount(req as Request, res as Response);
      
      expect(res.json).toHaveBeenCalledWith({
        transactions: {
          balance: 0,
          totalIncoming: 0,
          totalOutgoing: 0
        }
      });
    });

    it('should handle errors', async () => {
      const errorMessage = 'Database error';
      
      (Transaction.aggregate as jest.MockedFunction<any>).mockRejectedValue(new Error(errorMessage));
      
      await transactionController.sumByAccount(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
}); 