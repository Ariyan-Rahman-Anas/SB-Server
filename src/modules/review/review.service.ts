import { db } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers";
import { z } from "zod";
import {
  createReviewSchema,
  reviewsQuerySchema,
  updateReviewSchema,
} from "./review.validation";

export const getReviews = async (query: z.infer<typeof reviewsQuerySchema>) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const where = {
    ...(query.productId && { productId: query.productId }),
    ...(query.userId && { userId: query.userId }),
    ...(query.rating && { rating: query.rating }),
    ...(query.isVerified !== undefined && { isVerified: query.isVerified }),
  };

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: query.sortOrder },
      include: {
        user: { select: { id: true, name: true, image: true } },
        product: { select: { id: true, title: true, slug: true } },
      },
    }),
    db.review.count({ where }),
  ]);

  return { reviews, meta: buildPaginationMeta(total, page, limit) };
};

export const createReview = async (
  userId: string,
  data: z.infer<typeof createReviewSchema>
) => {
  // Check if product exists
  const product = await db.product.findUnique({
    where: { id: data.productId, status: "PUBLISHED" },
  });
  if (!product) throw new AppError("Product not found", 404);

  // Check if user already reviewed this product
  const existing = await db.review.findUnique({
    where: { productId_userId: { productId: data.productId, userId } },
  });
  if (existing)
    throw new AppError("You have already reviewed this product", 409);

  // Optionally mark as verified if user has a delivered order with this product
  const hasOrderedProduct = await db.orderItem.findFirst({
    where: {
      productId: data.productId,
      order: { userId, status: "DELIVERED" },
    },
  });

  return db.review.create({
    data: {
      ...data,
      userId,
      isVerified: !!hasOrderedProduct,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });
};

export const updateReview = async (
  id: string,
  userId: string,
  data: z.infer<typeof updateReviewSchema>
) => {
  const review = await db.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Review not found", 404);
  if (review.userId !== userId) throw new AppError("Forbidden", 403);

  return db.review.update({ where: { id }, data });
};

export const deleteReview = async (
  id: string,
  userId: string,
  isAdmin: boolean
) => {
  const review = await db.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Review not found", 404);
  if (!isAdmin && review.userId !== userId)
    throw new AppError("Forbidden", 403);

  return db.review.delete({ where: { id } });
};

export const toggleVerifyReview = async (id: string) => {
  const review = await db.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Review not found", 404);

  return db.review.update({
    where: { id },
    data: { isVerified: !review.isVerified },
  });
};
