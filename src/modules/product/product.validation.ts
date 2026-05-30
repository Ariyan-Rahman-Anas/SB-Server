import { z } from "zod";

const PRODUCT_TYPES = ["SINGLE", "VARIABLE"] as const;
const PRICE_TYPES = ["COMMON", "ATTRIBUTE_BASED"] as const;
const STOCK_TYPES = ["COMMON", "ATTRIBUTE_BASED"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const ATTRIBUTE_TYPES = ["COLOR", "SIZE"] as const;
const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;

// ── Image ─────────────────────────────────────────────────────────────────────
const productImageSchema = z.object({
  photoURL: z.string().url("Image URL must be valid"),
  isPrimary: z.boolean().default(false),
  isThumbnail: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  attributeId: z.string().cuid().optional(),
});

// ── Attribute ─────────────────────────────────────────────────────────────────
const productAttributeSchema = z.object({
  attributeType: z.enum(ATTRIBUTE_TYPES),
  title: z.string().min(1).max(100),
  description: z.string().max(50).optional(), // hex code or size label
  stock: z.number().int().min(0).optional(),
  regularPrice: z.number().positive().optional(),
  salesPrice: z.number().positive().optional(),
  images: z.array(productImageSchema).default([]),
});

// ── Discount ──────────────────────────────────────────────────────────────────
const productDiscountSchema = z.object({
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z.number().positive("Discount value must be positive"),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

// ── Base product object (shared between create & update) ──────────────────────
const baseProductObject = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z
    .string()
    .max(300)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes")
    .optional(),
  productCode: z.string().min(1).max(50).optional(),
  barcode: z.string().max(50).optional(),
  productType: z.enum(PRODUCT_TYPES).default("SINGLE"),
  priceType: z.enum(PRICE_TYPES).default("COMMON"),
  stockType: z.enum(STOCK_TYPES).default("COMMON"),
  status: z.enum(STATUSES).default("DRAFT"),

  regularPrice: z.number().positive().optional(),
  salesPrice: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),

  shortDescription: z.string().max(500).optional(),
  longDescription: z.string().optional(),
  ingredients: z.string().optional(),
  other: z.string().optional(),

  brandId: z.string().cuid("Invalid brand ID").optional(),
  categoryId: z.string().cuid("Invalid category ID").optional(),

  attributes: z.array(productAttributeSchema).default([]),
  images: z.array(productImageSchema).default([]),
  discounts: z.array(productDiscountSchema).default([]),
});

// ── Create Product ─────────────────────────────────────────────────────────────
export const createProductSchema = baseProductObject.refine(
  (data) => {
    if (data.regularPrice && data.salesPrice) {
      return data.salesPrice <= data.regularPrice;
    }
    return true;
  },
  { message: "Sales price cannot exceed regular price", path: ["salesPrice"] }
);

// ── Update Product (.partial() must be on the base ZodObject, not ZodEffects) ─
export const updateProductSchema = baseProductObject.partial();

export const productIdParamSchema = z.object({
  id: z.string().cuid("Invalid product ID"),
});

export const productsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(STATUSES).optional(),
  brandId: z.string().cuid().optional(),
  categoryId: z.string().cuid().optional(),
  productType: z.enum(PRODUCT_TYPES).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sortBy: z
    .enum(["createdAt", "title", "regularPrice", "salesPrice"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
