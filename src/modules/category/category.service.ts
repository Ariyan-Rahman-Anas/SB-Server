import { db } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { slugify, buildPaginationMeta, parsePagination } from "../../utils/helpers";
import { z } from "zod";
import {
  categoriesQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";
import { StatusCodes } from "http-status-codes";

export const getAllCategories = async (
  query: z.infer<typeof categoriesQuerySchema>
) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const where = {
    ...(query.search && {
      name: { contains: query.search, mode: "insensitive" as const },
    }),
    ...(query.parentId === "null"
      ? { parentId: null }
      : query.parentId
        ? { parentId: query.parentId }
        : {}),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  };

  const [categories, total] = await Promise.all([
    db.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { children: true, products: true } },
      },
    }),
    db.category.count({ where }),
  ]);

  return { categories, meta: buildPaginationMeta(total, page, limit) };
};

export const getCategoryById = async (id: string) => {
  const category = await db.category.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        where: { isActive: true },
        select: { id: true, name: true, slug: true, image: true },
      },
      _count: { select: { products: true } },
    },
  });
  if (!category) throw new AppError("Category not found", StatusCodes.NOT_FOUND);
  return category;
};

export const createCategory = async (
  data: z.infer<typeof createCategorySchema>
) => {
  const slug = data.slug ?? slugify(data.name);

  const existing = await db.category.findFirst({
    where: { OR: [{ name: data.name }, { slug }] },
  });
  if (existing)
    throw new AppError("A category with this name or slug already exists", 409);

  if (data.parentId) {
    const parent = await db.category.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new AppError("Parent category not found", 404);
  }

  return db.category.create({ data: { ...data, slug } });
};

export const updateCategory = async (
  id: string,
  data: z.infer<typeof updateCategorySchema>
) => {
  const category = await db.category.findUnique({ where: { id } });
  if (!category) throw new AppError("Category not found", 404);

  // Prevent circular parent reference
  if (data.parentId === id)
    throw new AppError("Category cannot be its own parent", 400);

  const slug = data.name && !data.slug ? slugify(data.name) : data.slug;

  return db.category.update({
    where: { id },
    data: { ...data, ...(slug && { slug }) },
  });
};

export const deleteCategory = async (id: string) => {
  const category = await db.category.findUnique({
    where: { id },
    include: {
      _count: { select: { children: true, products: true } },
    },
  });
  if (!category) throw new AppError("Category not found", 404);
  if (category._count.children > 0)
    throw new AppError("Cannot delete category — it has sub-categories", 400);
  if (category._count.products > 0)
    throw new AppError(
      `Cannot delete category — it has ${category._count.products} associated products`,
      400
    );

  return db.category.delete({ where: { id } });
};
