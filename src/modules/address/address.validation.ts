import { z } from "zod";

const ADDRESS_TYPES = ["HOME", "OFFICE", "OTHER"] as const;

export const createAddressSchema = z.object({
  addressType: z.enum(ADDRESS_TYPES).default("HOME"),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(255),
  city: z.string().min(2, "City is required").max(100),
  countryCode: z
    .string()
    .regex(/^\+\d{1,4}$/, "Invalid country code")
    .default("+880"),
  isPrimary: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export const addressIdParamSchema = z.object({
  id: z.string().cuid("Invalid address ID"),
});
