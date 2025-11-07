import { z } from 'zod';

// Account schemas
export const accountSchema = {
  create: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    order: z.number().optional()
  }),
  update: z.object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().optional(),
    order: z.number().optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  }),
  updateOrder: z.object({
    accounts: z.array(
      z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID"),
        order: z.number().int().min(0)
      })
    ).min(1, "At least one account is required")
  })
};

// Category schemas
export const categorySchema = {
  create: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    type: z.enum(['Income', 'Expense']).optional(),
    parent: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid parent ID").optional().nullable()
  }),
  update: z.object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    type: z.enum(['Income', 'Expense']).optional(),
    parent: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid parent ID").optional().nullable()
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  })
  ,
  updateOrder: z.object({
    categories: z.array(
      z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID"),
        order: z.number().int().min(0),
        parent: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid parent ID").optional().nullable()
      })
    ).min(1, "At least one category is required")
  }),
  syncPull: z.object({
    lastSyncTimestamp: z.number().optional(),
    categoryHashes: z.record(z.string(), z.string()).optional()
  }),
  syncPush: z.object({
    categories: z.array(
      z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID"),
        name: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        type: z.enum(['Income', 'Expense']),
        parent: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid parent ID").optional().nullable(),
        updatedAt: z.number(),
        hash: z.string().optional()
      })
    ).min(1, "At least one category is required")
  })
};

// Transaction schemas
export const transactionSchema = {
  create: z.object({
    transactionDate: z.string().refine(val => !isNaN(new Date(val).getTime()), {
      message: "Invalid date format"
    }),
    fromAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID"),
    toAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID").optional(),
    amount: z.number().min(0, "Amount must be positive"),
    description: z.string().optional(),
    notes: z.string().optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional()
  }),
  update: z.object({
    transactionDate: z.string().refine(val => !isNaN(new Date(val).getTime()), {
      message: "Invalid date format"
    }).optional(),
    fromAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional(),
    toAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID").optional(),
    amount: z.number().min(0, "Amount must be positive").optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    type: z.enum(['income', 'expense', 'transfer']).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  }),
  query: z.object({
    fromAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional(),
    toAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID").optional(),
    fromDate: z.string().optional()
      .refine(val => !val || !isNaN(new Date(val).getTime()), {
        message: "Invalid from date format"
      }),
    toDate: z.string().optional()
      .refine(val => !val || !isNaN(new Date(val).getTime()), {
        message: "Invalid to date format"
      })
  })
  ,
  syncPull: z.object({
    lastSyncTimestamp: z.number().optional(),
    transactionHashes: z.record(z.string(), z.string()).optional()
  }),
  syncPush: z.object({
    transactions: z.array(
      z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid transaction ID"),
        transactionDate: z.string().refine(val => !isNaN(new Date(val).getTime()), { message: "Invalid date format" }),
        fromAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID"),
        toAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional(),
        category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid category ID").optional(),
        amount: z.number().min(0, "Amount must be positive"),
        description: z.string().optional(),
        notes: z.string().optional(),
        type: z.enum(['income', 'expense', 'transfer']).optional(),
        updatedAt: z.number(),
        hash: z.string().optional()
      })
    ).min(1, "At least one transaction is required")
  })
}; 