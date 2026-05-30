import { z } from "zod";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

const PAYMENT_STATUSES = [
  "UNPAID",
  "PAID",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

const DELIVERY_TYPES = ["HOME_DELIVERY", "STORE_PICKUP"] as const;

const orderItemSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
  title: z.string().min(1).max(255),
  image: z.string().url().optional(),
  color: z.string().max(50).optional(),
  size: z.string().max(50).optional(),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.number().positive("Unit price must be positive"),
  discountAmount: z.number().min(0).default(0),
});

export const createOrderSchema = z
  .object({
    // Authenticated user order
    addressId: z.string().cuid().optional(),

    // Guest checkout fields
    guestName: z.string().min(2).max(100).optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().regex(/^\d{7,15}$/).optional(),
    guestAddress: z.string().min(5).max(255).optional(),
    guestCity: z.string().min(2).max(100).optional(),

    deliveryType: z.enum(DELIVERY_TYPES).default("HOME_DELIVERY"),
    paymentMethod: z.string().min(1, "Payment method is required").max(50),
    paymentGateway: z.string().max(50).optional(),

    discount: z.number().min(0).default(0),
    deliveryCharge: z.number().min(0).default(0),

    notes: z.string().max(500).optional(),

    items: z
      .array(orderItemSchema)
      .min(1, "Order must have at least one item"),
  })
  .superRefine((data, ctx) => {
    // For home delivery without logged-in user, guest fields required
    if (data.deliveryType === "HOME_DELIVERY" && !data.addressId) {
      if (!data.guestAddress || !data.guestCity) {
        ctx.addIssue({
          code: "custom",
          message: "Delivery address and city are required for home delivery",
          path: ["guestAddress"],
        });
      }
    }
  });

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
});

export const orderIdParamSchema = z.object({
  id: z.string().cuid("Invalid order ID"),
});

export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  userId: z.string().cuid().optional(),
  search: z.string().max(100).optional(), // order number search
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
