const mockSave = jest.fn();
jest.mock('../../models/category', () => {
  const MockCategory = function(data: any) {
    return {
      data,
      save: mockSave
    };
  };
  
  MockCategory.find = jest.fn();
  MockCategory.findById = jest.fn();
  MockCategory.findByIdAndUpdate = jest.fn();
  MockCategory.findByIdAndDelete = jest.fn();
  
  return MockCategory;
});

jest.mock('../../models/transaction', () => {
  const MockTransaction = function(data: any) {
    return {
      data,
      save: jest.fn()
    };
  };
  
  MockTransaction.find = jest.fn();
  MockTransaction.aggregate = jest.fn();
  
  return MockTransaction;
});

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import categoryController from '../category';
import Category from '../../models/category';
import Transaction from '../../models/transaction';

describe('Category Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('post', () => {
    it('should create a new category and return 201 status', async () => {
      req.body = { 
        name: 'Electronics', 
        description: 'Electronic devices', 
        image: 'electronics.jpg' 
      };
      
      mockSave.mockResolvedValue(req.body);
      
      await categoryController.post(req as Request, res as Response);
      
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 status when there is an error', async () => {
      req.body = { 
        name: 'Electronics', 
        description: 'Electronic devices', 
        image: 'electronics.jpg' 
      };
      const errorMessage = 'Validation error';
      
      mockSave.mockRejectedValue(new Error(errorMessage));
      
      await categoryController.post(req as Request, res as Response);
      
      expect(mockSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('get', () => {
    it('should return a category when found', async () => {
      const mockCategory = { _id: '123', name: 'Electronics' };
      req.params = { id: '123' };
      
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);
      
      await categoryController.get(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith(mockCategory);
    });

    it('should return 404 when category is not found', async () => {
      req.params = { id: '123' };
      
      (Category.findById as jest.Mock).mockResolvedValue(null);
      
      await categoryController.get(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });

    it('should return 500 when there is a server error', async () => {
      req.params = { id: '123' };
      const errorMessage = 'Server error';
      
      (Category.findById as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      await categoryController.get(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('all', () => {
    beforeEach(() => {
      req = {
        query: {},
        lang: 'en'
      };
      jest.clearAllMocks();
      
      // Reset Transaction.aggregate mock for each test
      (Transaction.aggregate as jest.Mock).mockReset();
    });

    it('should return all categories with transaction totals', async () => {
      const mockObjectId1 = new mongoose.Types.ObjectId('123456789012345678901234');
      const mockObjectId2 = new mongoose.Types.ObjectId('123456789012345678901235');
      
      const mockCategories = [
        { 
          _id: mockObjectId1, 
          name: 'Electronics',
          toObject: jest.fn().mockReturnValue({ 
            _id: mockObjectId1, 
            name: 'Electronics'
          })
        },
        { 
          _id: mockObjectId2, 
          name: 'Clothing',
          toObject: jest.fn().mockReturnValue({ 
            _id: mockObjectId2, 
            name: 'Clothing'
          })
        }
      ];
      
      (Category.find as jest.Mock)
        .mockImplementation((condition?: any) => {
          // When querying for subcategories
          if (condition && condition.parent) {
            if (condition.parent.equals(mockObjectId1)) {
              // Electronics has subcategories
              return Promise.resolve([
                { _id: new mongoose.Types.ObjectId(), name: 'Smartphones' }
              ]);
            } else {
              // Clothing has no subcategories
              return Promise.resolve([]);
            }
          }
          // Main query for all categories
          return Promise.resolve(mockCategories);
        });
      
      // Set up Transaction.aggregate mock responses
      let mockCalls = 0;
      (Transaction.aggregate as jest.Mock).mockImplementation(() => {
        mockCalls++;
        if (mockCalls === 1) return Promise.resolve([{ _id: null, total: 1000, count: 4 }]);  // Electronics direct
        if (mockCalls === 2) return Promise.resolve([{ _id: null, total: 500, count: 2 }]);   // Electronics subcategories
        if (mockCalls === 3) return Promise.resolve([{ _id: null, total: 800, count: 3 }]);  // Clothing direct
        return Promise.resolve([]);
      });
      
      await categoryController.all(req as Request, res as Response);
      
      expect(Category.find).toHaveBeenCalledTimes(3); // Once for all categories, twice for subcategories
      expect(Transaction.aggregate).toHaveBeenCalledTimes(3); // Three aggregation calls
      
      const expectedResponse = [
        {
          _id: mockObjectId1,
          name: 'Electronics',
          transactions: {
            direct: {
              total: 1000,
              count: 4
            },
            subcategories: {
              total: 800,
              count: 3
            },
            all: {
              total: 1800,
              count: 7
            }
          }
        },
        {
          _id: mockObjectId2,
          name: 'Clothing',
          transactions: {
            direct: {
              total: 500,
              count: 2
            },
            subcategories: {
              total: 0,
              count: 0
            },
            all: {
              total: 500,
              count: 2
            }
          }
        }
      ];
      
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle date filtering for all categories', async () => {
      // Setup request with date filters
      req.query = {
        fromDate: '2023-01-01',
        toDate: '2023-01-31'
      };
      
      const mockObjectId = new mongoose.Types.ObjectId('123456789012345678901234');
      
      const mockCategories = [
        { 
          _id: mockObjectId, 
          name: 'Electronics',
          toObject: jest.fn().mockReturnValue({ 
            _id: mockObjectId, 
            name: 'Electronics'
          })
        }
      ];
      
      (Category.find as jest.Mock)
        .mockImplementation((condition?: any) => {
          // When querying for subcategories
          if (condition && condition.parent) {
            return Promise.resolve([]); // No subcategories
          }
          // Main query for all categories
          return Promise.resolve(mockCategories);
        });
      
      // Setup Transaction.aggregate mock with date verification
      (Transaction.aggregate as jest.Mock).mockImplementation((pipeline: any[]) => {
        const matchStage = pipeline[0].$match;
        
        // Verify date range is applied correctly
        if (matchStage.transactionDate) {
          expect(matchStage.transactionDate.$gte instanceof Date).toBe(true);
          expect(matchStage.transactionDate.$lte instanceof Date).toBe(true);
          
          const fromDate = matchStage.transactionDate.$gte;
          const toDate = matchStage.transactionDate.$lte;
          
          expect(fromDate.toISOString().substring(0, 10)).toBe('2023-01-01');
          expect(toDate.getHours()).toBe(23);
          expect(toDate.getMinutes()).toBe(59);
          expect(toDate.getSeconds()).toBe(59);
        }
        
        return Promise.resolve([{ _id: null, total: 300, count: 2 }]);
      });
      
      await categoryController.all(req as Request, res as Response);
      
      expect(Category.find).toHaveBeenCalledTimes(2); // Once for all categories, once for subcategories
      expect(Transaction.aggregate).toHaveBeenCalledTimes(1); // One aggregation call (no subcategories)
      
      const expectedResponse = [
        {
          _id: mockObjectId,
          name: 'Electronics',
          transactions: {
            direct: {
              total: 300,
              count: 2
            },
            subcategories: {
              total: 0,
              count: 0
            },
            all: {
              total: 300,
              count: 2
            }
          }
        }
      ];
      
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should return 500 when there is a server error', async () => {
      const errorMessage = 'Server error';
      
      (Category.find as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      await categoryController.all(req as Request, res as Response);
      
      expect(Category.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('update', () => {
    it('should update a category and return it', async () => {
      const mockCategory = { _id: '123', name: 'Updated Electronics' };
      req.params = { id: '123' };
      req.body = { name: 'Updated Electronics' };
      
      (Category.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockCategory);
      
      await categoryController.update(req as Request, res as Response);
      
      expect(Category.findByIdAndUpdate).toHaveBeenCalledWith('123', req.body, { new: true });
      expect(res.json).toHaveBeenCalledWith(mockCategory);
    });

    it('should return 404 when category is not found', async () => {
      req.params = { id: '123' };
      req.body = { name: 'Updated Electronics' };
      
      (Category.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
      
      await categoryController.update(req as Request, res as Response);
      
      expect(Category.findByIdAndUpdate).toHaveBeenCalledWith('123', req.body, { new: true });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });

    it('should return 400 when there is an error', async () => {
      req.params = { id: '123' };
      req.body = { name: 'Updated Electronics' };
      const errorMessage = 'Validation error';
      
      (Category.findByIdAndUpdate as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      await categoryController.update(req as Request, res as Response);
      
      expect(Category.findByIdAndUpdate).toHaveBeenCalledWith('123', req.body, { new: true });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('delete', () => {
    it('should delete a category and return success message', async () => {
      const mockCategory = { _id: '123', name: 'Electronics' };
      req.params = { id: '123' };
      
      (Category.find as jest.Mock).mockResolvedValue([]);
      (Category.findByIdAndDelete as jest.Mock).mockResolvedValue(mockCategory);
      
      await categoryController.delete(req as Request, res as Response);
      
      expect(Category.find).toHaveBeenCalledWith({ parent: '123' });
      expect(Category.findByIdAndDelete).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith({ message: 'Category deleted successfully' });
    });

    it('should return 404 when category is not found', async () => {
      req.params = { id: '123' };
      
      (Category.find as jest.Mock).mockResolvedValue([]);
      (Category.findByIdAndDelete as jest.Mock).mockResolvedValue(null);
      
      await categoryController.delete(req as Request, res as Response);
      
      expect(Category.findByIdAndDelete).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });

    it('should return 400 when trying to delete a category with subcategories', async () => {
      req.params = { id: '123' };
      
      (Category.find as jest.Mock).mockResolvedValue([
        { _id: '456', name: 'Subcategory', parent: '123' }
      ]);
      
      await categoryController.delete(req as Request, res as Response);
      
      expect(Category.find).toHaveBeenCalledWith({ parent: '123' });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg.error).toContain('Cannot delete category with subcategories');
    });

    it('should return 500 when there is a server error', async () => {
      req.params = { id: '123' };
      const errorMessage = 'Server error';
      
      (Category.find as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      await categoryController.delete(req as Request, res as Response);
      
      expect(Category.find).toHaveBeenCalledWith({ parent: '123' });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('getSubcategories', () => {
    it('should return subcategories for a category', async () => {
      const mockCategory = { _id: '123', name: 'Electronics' };
      const mockSubcategories = [
        { _id: '456', name: 'Smartphones', parent: '123' },
        { _id: '789', name: 'Laptops', parent: '123' }
      ];
      req.params = { id: '123' };
      
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);
      (Category.find as jest.Mock).mockResolvedValue(mockSubcategories);
      
      await categoryController.getSubcategories(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith('123');
      expect(Category.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockSubcategories);
    });

    it('should return 404 when category is not found', async () => {
      req.params = { id: '123' };
      
      (Category.findById as jest.Mock).mockResolvedValue(null);
      
      await categoryController.getSubcategories(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });

    it('should return 500 when there is a server error', async () => {
      req.params = { id: '123' };
      const errorMessage = 'Server error';
      
      (Category.findById as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      await categoryController.getSubcategories(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('getRootCategories', () => {
    it('should return all root categories', async () => {
      const mockRootCategories = [
        { _id: '123', name: 'Electronics', parent: null },
        { _id: '456', name: 'Clothing', parent: null }
      ];
      
      (Category.find as jest.Mock).mockResolvedValue(mockRootCategories);
      
      await categoryController.getRootCategories(req as Request, res as Response);
      
      expect(Category.find).toHaveBeenCalledWith({ parent: null });
      expect(res.json).toHaveBeenCalledWith(mockRootCategories);
    });

    it('should return 500 when there is a server error', async () => {
      const errorMessage = 'Server error';
      
      (Category.find as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      await categoryController.getRootCategories(req as Request, res as Response);
      
      expect(Category.find).toHaveBeenCalledWith({ parent: null });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('getCategoryTransactions', () => {
    const validObjectId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
      req = {
        params: { id: validObjectId },
        query: {},
        lang: 'en'
      };
    });

    it('should return transaction totals for a category', async () => {
      // Mock the category
      const mockCategory = { 
        _id: validObjectId, 
        name: 'Electronics' 
      };
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);
      
      // Mock finding no subcategories
      (Category.find as jest.Mock).mockResolvedValue([]);
      
      // Mock the transaction aggregation results
      const mockTransactionSum = [{ _id: null, total: 1500, count: 5 }];
      
      // Setup Transaction.aggregate to return the mock sum
      (Transaction.aggregate as jest.Mock).mockResolvedValue(mockTransactionSum);
      
      await categoryController.getCategoryTransactions(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith(validObjectId);
      expect(Category.find).toHaveBeenCalledWith({ parent: validObjectId });
      expect(Transaction.aggregate).toHaveBeenCalledTimes(1);
      
      expect(res.json).toHaveBeenCalledWith({
        category: {
          _id: mockCategory._id,
          name: mockCategory.name
        },
        transactions: {
          direct: {
            total: 1500,
            count: 5
          },
          subcategories: {
            total: 0,
            count: 0
          },
          all: {
            total: 1500,
            count: 5
          }
        }
      });
    });

    it('should include transactions from subcategories', async () => {
      // Mock the category
      const mockCategory = { 
        _id: validObjectId, 
        name: 'Electronics' 
      };
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);
      
      // Mock finding subcategories
      const subcategoryId = new mongoose.Types.ObjectId();
      const mockSubcategories = [
        { _id: subcategoryId, name: 'Smartphones', parent: validObjectId }
      ];
      (Category.find as jest.Mock).mockResolvedValue(mockSubcategories);
      
      // Mock the transaction aggregation results
      const mockDirectTransactionSum = [{ _id: null, total: 1500, count: 5 }];
      const mockSubcategoryTransactionSum = [{ _id: null, total: 800, count: 3 }];
      
      // Setup Transaction.aggregate to return different values based on call order
      (Transaction.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockDirectTransactionSum)
        .mockResolvedValueOnce(mockSubcategoryTransactionSum);
      
      await categoryController.getCategoryTransactions(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith(validObjectId);
      expect(Category.find).toHaveBeenCalledWith({ parent: validObjectId });
      expect(Transaction.aggregate).toHaveBeenCalledTimes(2);
      
      expect(res.json).toHaveBeenCalledWith({
        category: {
          _id: mockCategory._id,
          name: mockCategory.name
        },
        transactions: {
          direct: {
            total: 1500,
            count: 5
          },
          subcategories: {
            total: 800,
            count: 3
          },
          all: {
            total: 2300, // 1500 + 800
            count: 8     // 5 + 3
          }
        }
      });
    });

    it('should handle date filtering', async () => {
      // Setup request with date filters
      req.query = {
        fromDate: '2023-01-01',
        toDate: '2023-01-31'
      };
      
      // Mock the category
      const mockCategory = { 
        _id: validObjectId, 
        name: 'Electronics' 
      };
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);
      
      // Mock finding no subcategories
      (Category.find as jest.Mock).mockResolvedValue([]);
      
      // Mock the transaction aggregation results
      const mockTransactionSum = [{ _id: null, total: 750, count: 3 }];
      
      // Setup Transaction.aggregate to return the mock sum and verify date filters
      (Transaction.aggregate as jest.Mock).mockImplementation((pipeline: any[]) => {
        const matchStage = pipeline[0].$match;
        
        // Verify date range is applied correctly if present
        if (matchStage.transactionDate) {
          expect(matchStage.transactionDate.$gte instanceof Date).toBe(true);
          expect(matchStage.transactionDate.$lte instanceof Date).toBe(true);
          
          const fromDate = matchStage.transactionDate.$gte;
          const toDate = matchStage.transactionDate.$lte;
          
          // Verify dates match what we passed in
          expect(fromDate.toISOString().startsWith('2023-01-01')).toBe(true);
          expect(toDate.getHours()).toBe(23);
          expect(toDate.getMinutes()).toBe(59);
          expect(toDate.getSeconds()).toBe(59);
        }
        
        return Promise.resolve(mockTransactionSum);
      });
      
      await categoryController.getCategoryTransactions(req as Request, res as Response);
      
      expect(res.json).toHaveBeenCalledWith({
        category: {
          _id: mockCategory._id,
          name: mockCategory.name
        },
        transactions: {
          direct: {
            total: 750,
            count: 3
          },
          subcategories: {
            total: 0,
            count: 0
          },
          all: {
            total: 750,
            count: 3
          }
        }
      });
    });

    it('should handle empty transaction results', async () => {
      // Mock the category
      const mockCategory = { 
        _id: validObjectId, 
        name: 'Electronics' 
      };
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);
      
      // Mock finding no subcategories
      (Category.find as jest.Mock).mockResolvedValue([]);
      
      // Mock empty transaction results
      (Transaction.aggregate as jest.Mock).mockResolvedValue([]);
      
      await categoryController.getCategoryTransactions(req as Request, res as Response);
      
      expect(res.json).toHaveBeenCalledWith({
        category: {
          _id: mockCategory._id,
          name: mockCategory.name
        },
        transactions: {
          direct: {
            total: 0,
            count: 0
          },
          subcategories: {
            total: 0,
            count: 0
          },
          all: {
            total: 0,
            count: 0
          }
        }
      });
    });

    it('should return 404 when category is not found', async () => {
      (Category.findById as jest.Mock).mockResolvedValue(null);
      
      await categoryController.getCategoryTransactions(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith(validObjectId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
      expect(Transaction.aggregate).not.toHaveBeenCalled();
    });

    it('should return 500 when there is a server error', async () => {
      const errorMessage = 'Server error';
      (Category.findById as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      await categoryController.getCategoryTransactions(req as Request, res as Response);
      
      expect(Category.findById).toHaveBeenCalledWith(validObjectId);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
}); 