import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  comment: z.string().min(5, "Comment must be at least 5 characters").max(1000).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(5).max(1000).optional(),
});

export const reviewIdParamSchema = z.object({
  id: z.string().cuid("Invalid review ID"),
});

export const reviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  productId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  isVerified: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined
    ),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
