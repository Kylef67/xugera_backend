import { z } from 'zod';

// Account schemas
export const accountSchema = {
  create: z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    order: z.number().optional()
  }),
  update: z.object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().min(1, "Description is required").optional(),
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
    description: z.string().min(1, "Description is required").optional(),
    parent: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid parent ID").optional().nullable()
  }),
  update: z.object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().min(1, "Description is required").optional(),
    parent: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid parent ID").optional().nullable()
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  })
};

// Transaction schemas
export const transactionSchema = {
  create: z.object({
    transactionDate: z.string().refine(val => !isNaN(new Date(val).getTime()), {
      message: "Invalid date format"
    }),
    fromAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID"),
    //toAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID")
  }),
  update: z.object({
    transactionDate: z.string().refine(val => !isNaN(new Date(val).getTime()), {
      message: "Invalid date format"
    }).optional(),
    fromAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional(),
    toAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
  }),
  query: z.object({
    fromAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional(),
    toAccount: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid account ID").optional(),
    fromDate: z.string().optional()
      .refine(val => !val || !isNaN(new Date(val).getTime()), {
        message: "Invalid from date format"
      }),
    toDate: z.string().optional()
      .refine(val => !val || !isNaN(new Date(val).getTime()), {
        message: "Invalid to date format"
      })
  })
}; 