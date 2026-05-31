import { string, object, boolean, coerce } from "zod";

export const createBrandSchema = object({
  name: string().min(1, "Brand name is required").max(100),
  slug: string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes")
    .optional(),
  logo: string().url("Logo must be a valid URL").optional(),
  isActive: boolean().default(true),
});

export const updateBrandSchema = createBrandSchema.partial();

export const brandIdParamSchema = object({
  id: string().cuid("Invalid brand ID"),
});

export const brandsQuerySchema = object({
  page: coerce.number().int().positive().default(1),
  limit: coerce.number().int().positive().max(100).default(20),
  search: string().max(100).optional(),
  isActive: string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined
    ),
});
