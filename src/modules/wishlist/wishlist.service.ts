import { db } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export const getMyWishlist = async (userId: string) => {
  return db.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          regularPrice: true,
          salesPrice: true,
          status: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  });
};

export const addToWishlist = async (userId: string, productId: string) => {
  const product = await db.product.findUnique({
    where: { id: productId, status: "PUBLISHED" },
  });
  if (!product) throw new AppError("Product not found", 404);

  return db.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {}, // already exists — no-op
    include: { product: { select: { id: true, title: true } } },
  });
};

export const removeFromWishlist = async (userId: string, productId: string) => {
  const item = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!item) throw new AppError("Item not in wishlist", 404);

  return db.wishlistItem.delete({
    where: { userId_productId: { userId, productId } },
  });
};

export const clearWishlist = async (userId: string) => {
  return db.wishlistItem.deleteMany({ where: { userId } });
};
