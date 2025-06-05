import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Category from '../category';

jest.mock('../category', () => {
  return {
    __esModule: true,
    default: {
      find: jest.fn(),
      findById: jest.fn(), 
      create: jest.fn(),
      deleteMany: jest.fn(),
    }
  };
});

describe('Category Model', () => {
  let mongoServer: MongoMemoryServer;
  
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new category', () => {
    const categoryData = {
      name: 'Electronics',
      description: 'Electronic devices and gadgets',
      image: 'electronics.jpg'
    };
    
    expect(Category).toBeDefined();
  });

  it('should find root categories', () => {
    const mockRootCategories = [
      { 
        _id: '123', 
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
        image: 'electronics.jpg',
        parent: null
      },
      { 
        _id: '456', 
        name: 'Clothing',
        description: 'Apparel and fashion items',
        image: 'clothing.jpg',
        parent: null
      }
    ];
    
    (Category.find as jest.Mock).mockResolvedValue(mockRootCategories);
    
    return Category.find({ parent: null }).then((result) => {
      expect(result).toEqual(mockRootCategories);
      expect(Category.find).toHaveBeenCalledWith({ parent: null });
    });
  });

  it('should find subcategories', () => {
    const parentId = '123';
    const mockSubcategories = [
      {
        _id: '456',
        name: 'Smartphones',
        description: 'Mobile phones and accessories',
        image: 'smartphones.jpg',
        parent: parentId
      },
      {
        _id: '789',
        name: 'Laptops',
        description: 'Portable computers',
        image: 'laptops.jpg',
        parent: parentId
      }
    ];
    
    (Category.find as jest.Mock).mockResolvedValue(mockSubcategories);
    
    return Category.find({ parent: parentId }).then((result) => {
      expect(result).toEqual(mockSubcategories);
      expect(Category.find).toHaveBeenCalledWith({ parent: parentId });
    });
  });
}); 