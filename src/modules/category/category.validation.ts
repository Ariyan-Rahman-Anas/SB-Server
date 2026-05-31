import { z, string, object, boolean, coerce } from "zod";

export const createCategorySchema = object({
  name: string().min(1, "Category name is required").max(100),
  slug: string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes")
    .optional(),
  image: string().url("Image must be a valid URL").optional(),
  parentId: string().cuid("Invalid parent category ID").optional(),
  isActive: boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamSchema = object({
  id: string().cuid("Invalid category ID"),
});

export const categoriesQuerySchema = object({
  page: coerce.number().int().positive().default(1),
  limit: coerce.number().int().positive().max(100).default(50),
  search: string().max(100).optional(),
  parentId: string().optional(), // "null" to get root categories
  isActive: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined
    ),
});
