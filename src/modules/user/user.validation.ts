import { string, object, enum as zEnum, coerce } from "zod";

const ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "CUSTOMER"] as const;

export const updateProfileSchema = object({
  name: string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .optional(),
  firstName: string().min(1).max(50).optional(),
  lastName: string().max(50).optional(),
  phone: string()
    .regex(/^\d{7,15}$/, "Invalid phone number")
    .optional(),
  countryCode: string()
    .regex(/^\+\d{1,4}$/, "Invalid country code")
    .optional(),
  image: string().url("Invalid image URL").optional(),
});

export const updateUserRoleSchema = object({
  role: zEnum(ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ROLES.join(", ")}` }),
  }),
});

export const getUsersQuerySchema = object({
  page: coerce.number().int().positive().default(1),
  limit: coerce.number().int().positive().max(100).default(20),
  search: string().max(100).optional(),
  role: zEnum(ROLES).optional(),
  isActive: string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
});

export const idParamSchema = object({
  id: string().cuid("Invalid ID format"),
});
