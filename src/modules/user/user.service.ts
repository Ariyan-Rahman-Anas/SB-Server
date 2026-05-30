import { db } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers";
import { z } from "zod";
import {
  getUsersQuerySchema,
  updateProfileSchema,
  updateUserRoleSchema,
} from "./user.validation";

// ── Get own profile ──────────────────────────────────────────────────────────
export const getMyProfile = async (userId: string) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      firstName: true,
      lastName: true,
      phone: true,
      countryCode: true,
      role: true,
      isActive: true,
      createdAt: true,
      addresses: {
        orderBy: { isPrimary: "desc" },
      },
    },
  });

  if (!user) throw new AppError("User not found", 404);
  return user;
};

// ── Update own profile ───────────────────────────────────────────────────────
export const updateMyProfile = async (
  userId: string,
  data: z.infer<typeof updateProfileSchema>
) => {
  return db.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      firstName: true,
      lastName: true,
      phone: true,
      countryCode: true,
      role: true,
      updatedAt: true,
    },
  });
};

// ── Admin: get all users ─────────────────────────────────────────────────────
export const getAllUsers = async (
  query: z.infer<typeof getUsersQuerySchema>
) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const where = {
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: "insensitive" as const } },
        { email: { contains: query.search, mode: "insensitive" as const } },
        { phone: { contains: query.search, mode: "insensitive" as const } },
      ],
    }),
    ...(query.role && { role: query.role }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
    db.user.count({ where }),
  ]);

  return { users, meta: buildPaginationMeta(total, page, limit) };
};

// ── Admin: get single user ───────────────────────────────────────────────────
export const getUserById = async (id: string) => {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      firstName: true,
      lastName: true,
      phone: true,
      countryCode: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      addresses: { orderBy: { isPrimary: "desc" } },
      _count: { select: { orders: true, reviews: true } },
    },
  });

  if (!user) throw new AppError("User not found", 404);
  return user;
};

// ── Admin: update user role ──────────────────────────────────────────────────
export const updateUserRole = async (
  id: string,
  data: z.infer<typeof updateUserRoleSchema>,
  requesterId: string
) => {
  if (id === requesterId) {
    throw new AppError("You cannot change your own role", 400);
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found", 404);

  return db.user.update({
    where: { id },
    data: { role: data.role },
    select: { id: true, email: true, role: true },
  });
};

// ── Admin: toggle user active status ─────────────────────────────────────────
export const toggleUserActive = async (id: string, requesterId: string) => {
  if (id === requesterId) {
    throw new AppError("You cannot deactivate your own account", 400);
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found", 404);

  return db.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, isActive: true },
  });
};
