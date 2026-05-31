import { z, string, object, boolean, number, enum as zEnum, array, coerce } from "zod";

const PRODUCT_TYPES = ["SINGLE", "VARIABLE"] as const;
const PRICE_TYPES = ["COMMON", "ATTRIBUTE_BASED"] as const;
const STOCK_TYPES = ["COMMON", "ATTRIBUTE_BASED"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const ATTRIBUTE_TYPES = ["COLOR", "SIZE"] as const;
const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;

// ── Image 
const productImageSchema = object({
  photoURL: string().url("Image URL must be valid"),
  isPrimary: boolean().default(false),
  isThumbnail: boolean().default(false),
  sortOrder: number().int().default(0),
  attributeId: string().cuid().optional(),
});

// ── Attribute 
const productAttributeSchema = object({
  attributeType: zEnum(ATTRIBUTE_TYPES),
  title: string().min(1).max(100),
  description: string().max(50).optional(), // hex code or size label
  stock: number().int().min(0).optional(),
  regularPrice: number().positive().optional(),
  salesPrice: number().positive().optional(),
  images: array(productImageSchema).default([]),
});

// ── Discount 
const productDiscountSchema = object({
  discountType: zEnum(DISCOUNT_TYPES),
  discountValue: number().positive("Discount value must be positive"),
  startsAt: coerce.date().optional(),
  endsAt: coerce.date().optional(),
  isActive: boolean().default(true),
});

// ── Base product object (shared between create & update) 
const baseProductObject = object({
  title: string().min(1, "Title is required").max(255),
  slug: string()
    .max(300)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes")
    .optional(),
  productCode: string().min(1).max(50).optional(),
  barcode: string().max(50).optional(),
  productType: zEnum(PRODUCT_TYPES).default("SINGLE"),
  priceType: zEnum(PRICE_TYPES).default("COMMON"),
  stockType: zEnum(STOCK_TYPES).default("COMMON"),
  status: zEnum(STATUSES).default("DRAFT"),

  regularPrice: number().positive().optional(),
  salesPrice: number().positive().optional(),
  stock: number().int().min(0).optional(),

  shortDescription: string().max(500).optional(),
  longDescription: string().optional(),
  ingredients: string().optional(),
  other: string().optional(),

  brandId: string().cuid("Invalid brand ID").optional(),
  categoryId: string().cuid("Invalid category ID").optional(),

  attributes: array(productAttributeSchema).default([]),
  images: array(productImageSchema).default([]),
  discounts: array(productDiscountSchema).default([]),
});

// ── Create Product 
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

export const productIdParamSchema = object({
  id: string().cuid("Invalid product ID"),
});

export const productsQuerySchema = object({
  page: coerce.number().int().positive().default(1),
  limit: coerce.number().int().positive().max(100).default(20),
  search: string().max(200).optional(),
  status: zEnum(STATUSES).optional(),
  brandId: string().cuid().optional(),
  categoryId: string().cuid().optional(),
  productType: zEnum(PRODUCT_TYPES).optional(),
  minPrice: coerce.number().positive().optional(),
  maxPrice: coerce.number().positive().optional(),
  sortBy: z
    .enum(["createdAt", "title", "regularPrice", "salesPrice"])
    .default("createdAt"),
  sortOrder: zEnum(["asc", "desc"]).default("desc"),
});
