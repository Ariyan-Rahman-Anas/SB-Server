import { string, enum as zEnum, boolean, object } from "zod";

const ADDRESS_TYPES = ["HOME", "OFFICE", "OTHER"] as const;

export const createAddressSchema = object({
  addressType: zEnum(ADDRESS_TYPES).default("HOME"),
  address: string().min(5, "Address must be at least 5 characters").max(255),
  city: string().min(2, "City is required").max(100),
  countryCode: string()
    .regex(/^\+\d{1,4}$/, "Invalid country code")
    .default("+880"),
  isPrimary: boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export const addressIdParamSchema = object({
  id: string().cuid("Invalid address ID"),
});
