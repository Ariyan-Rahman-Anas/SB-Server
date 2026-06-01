import { db } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  slugify,
  generateProductCode,
  buildPaginationMeta,
  parsePagination,
} from "../../utils/helpers";
import { z } from "zod";
import {
  createProductSchema,
  productsQuerySchema,
  updateProductSchema,
} from "./product.validation";

// ── List products 
export const getAllProducts = async (
  query: z.infer<typeof productsQuerySchema>,
  isAdmin = false
) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const where = {
    // Public users can only see published products
    ...(!isAdmin && { status: "PUBLISHED" as const }),
    ...(isAdmin && query.status && { status: query.status }),
    ...(query.search && {
      OR: [
        { title: { contains: query.search, mode: "insensitive" as const } },
        { productCode: { contains: query.search, mode: "insensitive" as const } },
      ],
    }),
    ...(query.brandId && { brandId: query.brandId }),
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.productType && { productType: query.productType }),
    ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
      regularPrice: {
        ...(query.minPrice !== undefined && { gte: query.minPrice }),
        ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
      },
    }),
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
          orderBy: { sortOrder: "asc" },
        },
        discounts: { where: { isActive: true } },
        _count: { select: { reviews: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  return { products, meta: buildPaginationMeta(total, page, limit) };
};

// ── Get single product ────────────────────────────────────────────────────────
export const getProductById = async (id: string, isAdmin = false) => {
  const product = await db.product.findUnique({
    where: {
      id,
      ...(!isAdmin && { status: "PUBLISHED" }),
    },
    include: {
      brand: true,
      category: { include: { parent: true } },
      attributes: {
        orderBy: { createdAt: "asc" },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      },
      images: { orderBy: { sortOrder: "asc" } },
      discounts: { where: { isActive: true } },
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!product) throw new AppError("Product not found", 404);
  return product;
};

// ── Get by slug ───────────────────────────────────────────────────────────────
export const getProductBySlug = async (slug: string) => {
  const product = await db.product.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      brand: true,
      category: { include: { parent: true } },
      attributes: {
        orderBy: { createdAt: "asc" },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      },
      images: { orderBy: { sortOrder: "asc" } },
      discounts: { where: { isActive: true } },
      _count: { select: { reviews: true } },
    },
  });

  if (!product) throw new AppError("Product not found", 404);
  return product;
};

// ── Create product ────────────────────────────────────────────────────────────
export const createProduct = async (data: z.infer<typeof createProductSchema>) => {
  const slug = data.slug ?? slugify(data.title);
  const productCode = data.productCode ?? generateProductCode();

  const existing = await db.product.findFirst({
    where: {
      OR: [{ slug }, { productCode }],
    },
  });
  if (existing)
    throw new AppError("A product with this slug or product code already exists", 409);

  const { attributes, images, discounts, ...productData } = data;

  return db.$transaction(
    async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          slug,
          productCode,
          regularPrice: productData.regularPrice ? productData.regularPrice : undefined,
          salesPrice: productData.salesPrice ? productData.salesPrice : undefined,
        },
      });

      // Create attributes in parallel, then collect their images
      const attrImageRows: {
        photoURL: string;
        publicId?: string;
        isPrimary: boolean;
        isThumbnail: boolean;
        sortOrder: number;
        attributeId: string | null;
        productId: string;
      }[] = [];

      if (attributes.length > 0) {
        await Promise.all(
          attributes.map(async (attr) => {
            const { images: attrImages, ...attrData } = attr;
            const createdAttr = await tx.productAttribute.create({
              data: { ...attrData, productId: product.id },
            });

            for (const img of attrImages) {
              attrImageRows.push({
                ...img,
                productId: product.id,
                attributeId: createdAttr.id,
              });
            }
          })
        );
      }

      // Batch all images in two createMany calls
      const allImages = [
        ...attrImageRows,
        ...images.map((img) => ({
          ...img,
          productId: product.id,
          attributeId: img.attributeId ?? null,
        })),
      ];

      await Promise.all([
        allImages.length > 0
          ? tx.productImage.createMany({ data: allImages })
          : Promise.resolve(),
        discounts.length > 0
          ? tx.productDiscount.createMany({
              data: discounts.map((d) => ({ ...d, productId: product.id })),
            })
          : Promise.resolve(),
      ]);

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          brand: true,
          category: true,
          attributes: { include: { images: true } },
          images: true,
          discounts: true,
        },
      });
    },
    { timeout: 30000 }
  );
};

// ── Update product ────────────────────────────────────────────────────────────
export const updateProduct = async (
  id: string,
  data: z.infer<typeof updateProductSchema>
) => {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Product not found", 404);

  const slug = data.title && !data.slug ? slugify(data.title) : data.slug;
  const { attributes: _a, images: _i, discounts: _d, ...updateData } = data;

  return db.product.update({
    where: { id },
    data: {
      ...updateData,
      ...(slug && { slug }),
    },
    include: {
      brand: true,
      category: true,
      attributes: { include: { images: true } },
      images: true,
      discounts: true,
    },
  });
};

// ── Delete product ────────────────────────────────────────────────────────────
export const deleteProduct = async (id: string) => {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Product not found", 404);

  return db.product.delete({ where: { id } });
};

// ── Update product status ─────────────────────────────────────────────────────
export const updateProductStatus = async (
  id: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
) => {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Product not found", 404);

  return db.product.update({ where: { id }, data: { status } });
};
