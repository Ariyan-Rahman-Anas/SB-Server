import { z } from "zod";

const ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "CUSTOMER"] as const;

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().max(50).optional(),
  phone: z
    .string()
    .regex(/^\d{7,15}$/, "Invalid phone number")
    .optional(),
  countryCode: z
    .string()
    .regex(/^\+\d{1,4}$/, "Invalid country code")
    .optional(),
  image: z.string().url("Invalid image URL").optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ROLES.join(", ")}` }),
  }),
});

export const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
});

export const idParamSchema = z.object({
  id: z.string().cuid("Invalid ID format"),
});
