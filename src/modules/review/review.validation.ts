import { string, object, number, enum as zEnum, coerce } from "zod";

export const createReviewSchema = object({
  productId: string().cuid("Invalid product ID"),
  rating: number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  comment: string().min(5, "Comment must be at least 5 characters").max(1000).optional(),
});

export const updateReviewSchema = object({
  rating: number().int().min(1).max(5).optional(),
  comment: string().min(5).max(1000).optional(),
});

export const reviewIdParamSchema = object({
  id: string().cuid("Invalid review ID"),
});

export const reviewsQuerySchema = object({
  page: coerce.number().int().positive().default(1),
  limit: coerce.number().int().positive().max(100).default(20),
  productId: string().cuid().optional(),
  userId: string().cuid().optional(),
  rating: coerce.number().int().min(1).max(5).optional(),
  isVerified: string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined
    ),
  sortOrder: zEnum(["asc", "desc"]).default("desc"),
});
