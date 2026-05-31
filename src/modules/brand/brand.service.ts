import { db } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { slugify, buildPaginationMeta, parsePagination } from "../../utils/helpers";
import { z } from "zod";
import {
  brandsQuerySchema,
  createBrandSchema,
  updateBrandSchema,
} from "./brand.validation";
import { StatusCodes } from "http-status-codes";

export const getAllBrands = async (query: z.infer<typeof brandsQuerySchema>) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const where = {
    ...(query.search && {
      name: { contains: query.search, mode: "insensitive" as const },
    }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  };

  const [brands, total] = await Promise.all([
    db.brand.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    db.brand.count({ where }),
  ]);

  return { brands, meta: buildPaginationMeta(total, page, limit) };
};

export const getBrandById = async (id: string) => {
  const brand = await db.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) throw new AppError("Brand not found", StatusCodes.NOT_FOUND);
  return brand;
};

export const createBrand = async (data: z.infer<typeof createBrandSchema>) => {
  const slug = data.slug ?? slugify(data.name);

  const existing = await db.brand.findFirst({
    where: { OR: [{ name: data.name }, { slug }] },
  });
  if (existing) throw new AppError("A brand with this name or slug already exists", StatusCodes.CONFLICT);

  return db.brand.create({ data: { ...data, slug } });
};

export const updateBrand = async (
  id: string,
  data: z.infer<typeof updateBrandSchema>
) => {
  const brand = await db.brand.findUnique({ where: { id } });
  if (!brand) throw new AppError("Brand not found", StatusCodes.NOT_FOUND);

  const slug = data.name && !data.slug ? slugify(data.name) : data.slug;

  return db.brand.update({
    where: { id },
    data: { ...data, ...(slug && { slug }) },
  });
};

export const deleteBrand = async (id: string) => {
  const brand = await db.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) throw new AppError("Brand not found", StatusCodes.NOT_FOUND);
  if (brand._count.products > 0)
    throw new AppError(
      `Cannot delete brand — it has ${brand._count.products} associated products`,
      StatusCodes.BAD_REQUEST
    );

  return db.brand.delete({ where: { id } });
};
