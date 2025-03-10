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
    req = {};
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
      // Simulate databse error when populating results
      (Transaction.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockRejectedValueOnce(new Error('Database error'))
      });
      
      await transactionController.all(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
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
      expect(res.json).toHaveBeenCalledWith(new Error('Not found'));
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
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
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
      // Note: the message says "Account deleted" which is a copy-paste error in the controller
      // This test is correct based on the actual implementation
      expect(res.json).toHaveBeenCalledWith({ message: 'Account deleted' });
    });
    
    it('should return 404 if transaction not found during delete', async () => {
      req.params = { id: 'nonexistent-id' };
      
      // Return null to simulate not finding the document
      (Transaction.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(null);
      
      await transactionController.delete(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
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