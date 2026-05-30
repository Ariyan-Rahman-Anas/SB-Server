import { db } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  generateOrderNumber,
  buildPaginationMeta,
  parsePagination,
} from "../../utils/helpers";
import { resend } from "../../lib/resend";
import { env } from "../../config/env";
import { orderConfirmationEmailHtml } from "../../auth/email-templates";
import { z } from "zod";
import {
  createOrderSchema,
  ordersQuerySchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from "./order.validation";

// ── Create order (transactional) ──────────────────────────────────────────────
export const createOrder = async (
  data: z.infer<typeof createOrderSchema>,
  userId?: string
) => {
  const subtotal = data.items.reduce(
    (sum, item) =>
      sum + item.quantity * item.unitPrice - (item.discountAmount ?? 0),
    0
  );
  const total = subtotal + data.deliveryCharge - data.discount;

  const order = await db.$transaction(async (tx) => {
    // Verify all products exist and have sufficient stock
    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId, status: "PUBLISHED" },
      });
      if (!product) {
        throw new AppError(`Product not found: ${item.title}`, 404);
      }
      // Check stock for SINGLE/COMMON stock products
      if (
        product.stockType === "COMMON" &&
        product.stock !== null &&
        product.stock < item.quantity
      ) {
        throw new AppError(`Insufficient stock for: ${product.title}`, 400);
      }
    }

    // Create the order
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: userId ?? null,
        addressId: data.addressId ?? null,
        status: "PENDING",
        paymentStatus: "UNPAID",
        paymentMethod: data.paymentMethod,
        paymentGateway: data.paymentGateway ?? null,
        deliveryType: data.deliveryType,
        subtotal,
        discount: data.discount,
        deliveryCharge: data.deliveryCharge,
        total,
        notes: data.notes ?? null,
        guestName: data.guestName ?? null,
        guestEmail: data.guestEmail ?? null,
        guestPhone: data.guestPhone ?? null,
        guestAddress: data.guestAddress ?? null,
        guestCity: data.guestCity ?? null,
      },
    });

    // Create order items and deduct stock
    for (const item of data.items) {
      const itemTotal =
        item.quantity * item.unitPrice - (item.discountAmount ?? 0);

      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: item.productId,
          title: item.title,
          image: item.image ?? null,
          color: item.color ?? null,
          size: item.size ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount ?? 0,
          total: itemTotal,
        },
      });

      // Deduct stock for COMMON stock type
      await tx.product.updateMany({
        where: { id: item.productId, stockType: "COMMON" },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return newOrder;
  });

  // Send order confirmation email (non-blocking)
  const recipientEmail = userId
    ? (await db.user.findUnique({ where: { id: userId } }))?.email
    : data.guestEmail;

  const recipientName =
    (userId
      ? (await db.user.findUnique({ where: { id: userId } }))?.name
      : data.guestName) ?? "Customer";

  if (recipientEmail) {
    resend.emails
      .send({
        from: env.RESEND_EMAIL_FROM,
        to: recipientEmail,
        subject: `Order Confirmed — ${order.orderNumber}`,
        html: orderConfirmationEmailHtml(
          recipientName,
          order.orderNumber,
          total.toFixed(2)
        ),
      })
      .catch(console.error);
  }

  return db.order.findUnique({
    where: { id: order.id },
    include: { items: true, address: true },
  });
};

// ── Get my orders (customer) ──────────────────────────────────────────────────
export const getMyOrders = async (
  userId: string,
  query: z.infer<typeof ordersQuerySchema>
) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const where = {
    userId,
    ...(query.status && { status: query.status }),
    ...(query.paymentStatus && { paymentStatus: query.paymentStatus }),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: query.sortOrder },
      include: {
        items: {
          include: { product: { select: { id: true, slug: true } } },
        },
        address: true,
      },
    }),
    db.order.count({ where }),
  ]);

  return { orders, meta: buildPaginationMeta(total, page, limit) };
};

// ── Get single order (owner or admin) ────────────────────────────────────────
export const getOrderById = async (id: string, userId?: string, isAdmin = false) => {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { id: true, title: true, slug: true } },
        },
      },
      address: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) throw new AppError("Order not found", 404);

  if (!isAdmin && order.userId !== userId) {
    throw new AppError("Forbidden", 403);
  }

  return order;
};

// ── Admin: get all orders ─────────────────────────────────────────────────────
export const getAllOrders = async (query: z.infer<typeof ordersQuerySchema>) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);

  const where = {
    ...(query.status && { status: query.status }),
    ...(query.paymentStatus && { paymentStatus: query.paymentStatus }),
    ...(query.userId && { userId: query.userId }),
    ...(query.search && {
      orderNumber: { contains: query.search, mode: "insensitive" as const },
    }),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: query.sortOrder },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
  ]);

  return { orders, meta: buildPaginationMeta(total, page, limit) };
};

// ── Update order status ───────────────────────────────────────────────────────
export const updateOrderStatus = async (
  id: string,
  data: z.infer<typeof updateOrderStatusSchema>
) => {
  const order = await db.order.findUnique({ where: { id } });
  if (!order) throw new AppError("Order not found", 404);

  return db.order.update({
    where: { id },
    data: { status: data.status },
  });
};

// ── Update payment status ─────────────────────────────────────────────────────
export const updatePaymentStatus = async (
  id: string,
  data: z.infer<typeof updatePaymentStatusSchema>
) => {
  const order = await db.order.findUnique({ where: { id } });
  if (!order) throw new AppError("Order not found", 404);

  return db.order.update({
    where: { id },
    data: { paymentStatus: data.paymentStatus },
  });
};
