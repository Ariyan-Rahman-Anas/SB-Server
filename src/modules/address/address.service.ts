import { db } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { z } from "zod";
import { createAddressSchema, updateAddressSchema } from "./address.validation";

export const getMyAddresses = async (userId: string) => {
  return db.address.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });
};

export const createAddress = async (
  userId: string,
  data: z.infer<typeof createAddressSchema>
) => {
  return db.$transaction(async (tx) => {
    // If new address is primary, unset all other primary addresses first
    if (data.isPrimary) {
      await tx.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return tx.address.create({ data: { ...data, userId } });
  });
};

export const updateAddress = async (
  id: string,
  userId: string,
  data: z.infer<typeof updateAddressSchema>
) => {
  const address = await db.address.findUnique({ where: { id } });
  if (!address) throw new AppError("Address not found", 404);
  if (address.userId !== userId) throw new AppError("Forbidden", 403);

  return db.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.address.updateMany({
        where: { userId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }
    return tx.address.update({ where: { id }, data });
  });
};

export const deleteAddress = async (id: string, userId: string) => {
  const address = await db.address.findUnique({ where: { id } });
  if (!address) throw new AppError("Address not found", 404);
  if (address.userId !== userId) throw new AppError("Forbidden", 403);
  if (address.isPrimary)
    throw new AppError("Cannot delete your primary address", 400);

  return db.address.delete({ where: { id } });
};

export const setPrimaryAddress = async (id: string, userId: string) => {
  const address = await db.address.findUnique({ where: { id } });
  if (!address) throw new AppError("Address not found", 404);
  if (address.userId !== userId) throw new AppError("Forbidden", 403);

  return db.$transaction(async (tx) => {
    await tx.address.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });
    return tx.address.update({
      where: { id },
      data: { isPrimary: true },
    });
  });
};
