const mockSave = jest.fn();
jest.mock('../../models/transaction', () => {
  const MockTransaction = function(data: any) {
    return {
      data,
      save: mockSave
    };
  };
  
  MockTransaction.find = jest.fn();
  MockTransaction.findById = jest.fn();
  MockTransaction.findByIdAndUpdate = jest.fn();
  MockTransaction.findByIdAndDelete = jest.fn();
  
  return MockTransaction;
});

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import transactionController from '../transaction';
import Transaction from '../../models/transaction';

// Main test suite for the Transaction controller
describe('Transaction Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mongoServer: MongoMemoryServer;
  
  // Setup in-memory MongoDB for testing
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });
  
  // Cleanup after all tests are done
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  // Reset mocks and setup fresh req/res objects before each test
  beforeEach(() => {
    req = {
      query: {} // Initialize query to empty object to prevent undefined issues
    };
    res = {
      status: jest.fn().mockReturnThis(), // allows for chaining .json()
      json: jest.fn()
    };
    jest.clearAllMocks(); // important to clear mocks between tests
  });
  
  // Test the post (create) endpoint
  describe('post', () => {
    it('should create a new transaction', async () => {
      // Setup test data
      const transactionData = {
        transactionDate: new Date(),
        account: new mongoose.Types.ObjectId().toString()
      };
      
      req.body = transactionData;
      mockSave.mockResolvedValueOnce(transactionData);
      
      // Call the controller method
      await transactionController.post(req as Request, res as Response);
      
      // Verify results
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });
    
    it('should handle errors when creating a transaction', async () => {
      req.body = {};
      const error = new Error('Failed to create transaction');
      
      // We need to make the transaction.save() throw an error
      // Instead of mocking mockSave, we need to make the actual save method throw
      mockSave.mockImplementationOnce(() => {
        throw error;
      });
      
      await transactionController.post(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create transaction' });
    });
  });
  
  // Test the all (list) endpoint
  describe('all', () => {
    it('should return all transactions', async () => {
      // Setup mock data for the test
      const mockTransactions = [
        { _id: '123', transactionDate: new Date(), account: '456' },
        { _id: '789', transactionDate: new Date(), account: '456' }
      ];
      
      // Mock the populate chain - this is a common pattern in Mongoose
      (Transaction.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockTransactions)
      });
      
      await transactionController.all(req as Request, res as Response);
      
      // Verify the correct methods were called
      expect(Transaction.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });
    
    it('should handle errors when fetching all transactions', async () => {
      // Simulate database error when populating results
      const error = new Error('Database error');
      
      (Transaction.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockRejectedValueOnce(error)
      });
      
      await transactionController.all(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
    
    it('should filter transactions by account ID', async () => {
      // Setup mock data and request with account filter
      const accountId = '123';
      req.query = { account: accountId };
      
      const mockTransactions = [
        { _id: '456', transactionDate: new Date(), account: accountId }
      ];
      
      (Transaction.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockTransactions)
      });
      
      await transactionController.all(req as Request, res as Response);
      
      // Verify filter was applied correctly
      expect(Transaction.find).toHaveBeenCalledWith(
        expect.objectContaining({ 
          account: accountId
        })
      );
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });
    
    it('should filter transactions by date range', async () => {
      // Setup mock data and request with date range filter
      req.query = { 
        fromDate: '2023-01-01',
        toDate: '2023-01-31'
      };
      
      const mockTransactions = [
        { _id: '123', transactionDate: new Date('2023-01-15'), account: '456' }
      ];
      
      (Transaction.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockTransactions)
      });
      
      await transactionController.all(req as Request, res as Response);
      
      // Verify filter was applied with date range
      expect(Transaction.find).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
      
      // Get the actual filter that was passed to find
      const filterArg = (Transaction.find as jest.Mock).mock.calls[0][0];
      
      // Verify the dates were processed correctly
      const fromDate = filterArg.transactionDate.$gte;
      const toDate = filterArg.transactionDate.$lte;
      
      expect(fromDate.getFullYear()).toBe(2023);
      expect(fromDate.getMonth()).toBe(0); // January is 0
      expect(fromDate.getDate()).toBe(1);
      expect(fromDate.getHours()).toBe(0);
      expect(fromDate.getMinutes()).toBe(0);
      
      expect(toDate.getFullYear()).toBe(2023);
      expect(toDate.getMonth()).toBe(0);
      expect(toDate.getDate()).toBe(31);
      expect(toDate.getHours()).toBe(23);
      expect(toDate.getMinutes()).toBe(59);
      expect(toDate.getSeconds()).toBe(59);
      
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });
    
    it('should filter transactions by date with time', async () => {
      // Setup mock data and request with date + time filter
      req.query = { 
        fromDate: '2023-01-15 09:30',
        toDate: '2023-01-15 17:45'
      };
      
      const mockTransactions = [
        { _id: '123', transactionDate: new Date('2023-01-15T12:00:00Z'), account: '456' }
      ];
      
      (Transaction.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockTransactions)
      });
      
      await transactionController.all(req as Request, res as Response);
      
      // Get the actual filter that was passed to find
      const filterArg = (Transaction.find as jest.Mock).mock.calls[0][0];
      
      // Verify the date-times were processed correctly
      const fromDate = filterArg.transactionDate.$gte;
      const toDate = filterArg.transactionDate.$lte;
      
      expect(fromDate.getFullYear()).toBe(2023);
      expect(fromDate.getMonth()).toBe(0);
      expect(fromDate.getDate()).toBe(15);
      expect(fromDate.getHours()).toBe(9);
      expect(fromDate.getMinutes()).toBe(30);
      expect(fromDate.getSeconds()).toBe(0);
      
      expect(toDate.getFullYear()).toBe(2023);
      expect(toDate.getMonth()).toBe(0);
      expect(toDate.getDate()).toBe(15);
      expect(toDate.getHours()).toBe(17);
      expect(toDate.getMinutes()).toBe(45);
      expect(toDate.getSeconds()).toBe(59);
      
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });
    
    it('should handle invalid date format in fromDate', async () => {
      req.query = { 
        fromDate: 'invalid-date'
      };
      
      await transactionController.all(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          error: expect.stringContaining('Invalid fromDate format')
        })
      );
      
      // Verify Transaction.find was not called
      expect(Transaction.find).not.toHaveBeenCalled();
    });
    
    it('should handle invalid date format in toDate', async () => {
      req.query = { 
        toDate: 'invalid-date'
      };
      
      await transactionController.all(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          error: expect.stringContaining('Invalid toDate format')
        })
      );
      
      // Verify Transaction.find was not called
      expect(Transaction.find).not.toHaveBeenCalled();
    });
    
    it('should handle invalid time format in fromDate', async () => {
      req.query = { 
        fromDate: '2023-01-15 25:70' // Invalid hours and minutes
      };
      
      await transactionController.all(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          error: expect.stringContaining('Invalid time values in fromDate')
        })
      );
      
      // Verify Transaction.find was not called
      expect(Transaction.find).not.toHaveBeenCalled();
    });
    
    it('should handle invalid time format in toDate', async () => {
      req.query = { 
        toDate: '2023-01-15 24:60' // Invalid hours and minutes
      };
      
      await transactionController.all(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          error: expect.stringContaining('Invalid time values in toDate')
        })
      );
      
      // Verify Transaction.find was not called
      expect(Transaction.find).not.toHaveBeenCalled();
    });
    
    it('should filter by both account and date range together', async () => {
      // Setup mock data and request with both filters
      const accountId = '123';
      req.query = { 
        account: accountId,
        fromDate: '2023-01-01',
        toDate: '2023-01-31'
      };
      
      const mockTransactions = [
        { _id: '456', transactionDate: new Date('2023-01-15'), account: accountId }
      ];
      
      (Transaction.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockTransactions)
      });
      
      await transactionController.all(req as Request, res as Response);
      
      // Verify filter combined both account and date range
      expect(Transaction.find).toHaveBeenCalledWith(
        expect.objectContaining({
          account: accountId,
          transactionDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
      
      expect(res.json).toHaveBeenCalledWith(mockTransactions);
    });
  });
  
  // Test the get (single item) endpoint
  describe('get', () => {
    it('should return a transaction by ID', async () => {
      const mockTransaction = { _id: '123', transactionDate: new Date(), account: '456' };
      req.params = { id: '123' };
      
      (Transaction.findById as jest.Mock).mockResolvedValueOnce(mockTransaction);
      
      await transactionController.get(req as Request, res as Response);
      
      expect(Transaction.findById).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith(mockTransaction);
    });
    
    it('should handle errors when fetching a transaction', async () => {
      req.params = { id: 'invalid-id' };
      
      // Simulate an error when finding by ID
      (Transaction.findById as jest.Mock).mockRejectedValueOnce(new Error('Not found'));
      
      await transactionController.get(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });
    
    it('should return 404 if transaction not found', async () => {
      req.params = { id: 'nonexistent' };
      
      (Transaction.findById as jest.Mock).mockResolvedValueOnce(null);
      
      await transactionController.get(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction not found' });
    });
  });
  
  // Test the update endpoint
  describe('update', () => {
    it('should update a transaction', async () => {
      const updatedTransaction = { 
        _id: '123', 
        transactionDate: new Date(), 
        account: '456' 
      };
      
      req.params = { id: '123' };
      req.body = { transactionDate: new Date() };
      
      (Transaction.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(updatedTransaction);
      
      await transactionController.update(req as Request, res as Response);
      
      // Check that update was called with correct params
      expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith('123', req.body, { new: true });
      expect(res.json).toHaveBeenCalledWith(updatedTransaction);
    });
    
    it('should return 404 if transaction not found during update', async () => {
      req.params = { id: 'nonexistent-id' };
      req.body = { transactionDate: new Date() };
      
      // Return null to simulate not finding the document
      (Transaction.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(null);
      
      await transactionController.update(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction not found' });
    });
    
    it('should handle errors when updating a transaction', async () => {
      req.params = { id: '123' };
      req.body = { transactionDate: new Date() };
      
      // Simulate a validation error or other DB error
      (Transaction.findByIdAndUpdate as jest.Mock).mockRejectedValueOnce(new Error('Update failed'));
      
      await transactionController.update(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Update failed' });
    });
  });
  
  // Test the delete endpoint
  describe('delete', () => {
    it('should delete a transaction', async () => {
      const deletedTransaction = { _id: '123', transactionDate: new Date(), account: '456' };
      req.params = { id: '123' };
      
      (Transaction.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(deletedTransaction);
      
      await transactionController.delete(req as Request, res as Response);
      
      expect(Transaction.findByIdAndDelete).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith({ message: 'Transaction deleted' });
    });
    
    it('should return 404 if transaction not found during delete', async () => {
      req.params = { id: 'nonexistent-id' };
      
      // Return null to simulate not finding the document
      (Transaction.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(null);
      
      await transactionController.delete(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Transaction not found' });
    });
    
    it('should handle errors when deleting a transaction', async () => {
      req.params = { id: '123' };
      
      // Simulate a DB error during delete
      (Transaction.findByIdAndDelete as jest.Mock).mockRejectedValueOnce(new Error('Delete failed'));
      
      await transactionController.delete(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Delete failed' });
    });
  });
}); 