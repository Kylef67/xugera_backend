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

import { Request, Response } from 'express';
import categoryController from '../category';
import Category from '../../models/category';

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
    it('should return all categories', async () => {
      const mockCategories = [
        { _id: '123', name: 'Electronics' },
        { _id: '456', name: 'Clothing' }
      ];
      
      (Category.find as jest.Mock).mockResolvedValue(mockCategories);
      
      await categoryController.all(req as Request, res as Response);
      
      expect(Category.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockCategories);
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
      expect(res.json).toHaveBeenCalledWith({ message: 'Category deleted' });
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
}); 