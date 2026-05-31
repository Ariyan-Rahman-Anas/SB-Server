import { z, string, object, number, enum as zEnum, array, coerce } from "zod";

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

const orderItemSchema = object({
  productId: string().cuid("Invalid product ID"),
  title: string().min(1).max(255),
  image: string().url().optional(),
  color: string().max(50).optional(),
  size: string().max(50).optional(),
  quantity: number().int().positive("Quantity must be at least 1"),
  unitPrice: number().positive("Unit price must be positive"),
  discountAmount: number().min(0).default(0),
});

export const createOrderSchema = z
  .object({
    // Authenticated user order
    addressId: string().cuid().optional(),

    // Guest checkout fields
    guestName: string().min(2).max(100).optional(),
    guestEmail: string().email().optional(),
    guestPhone: string().regex(/^\d{7,15}$/).optional(),
    guestAddress: string().min(5).max(255).optional(),
    guestCity: string().min(2).max(100).optional(),

    deliveryType: zEnum(DELIVERY_TYPES).default("HOME_DELIVERY"),
    paymentMethod: string().min(1, "Payment method is required").max(50),
    paymentGateway: string().max(50).optional(),

    discount: number().min(0).default(0),
    deliveryCharge: number().min(0).default(0),

    notes: string().max(500).optional(),

    items: array(orderItemSchema)
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

export const updateOrderStatusSchema = object({
  status: zEnum(ORDER_STATUSES),
});

export const updatePaymentStatusSchema = object({
  paymentStatus: zEnum(PAYMENT_STATUSES),
});

export const orderIdParamSchema = object({
  id: string().cuid("Invalid order ID"),
});

export const ordersQuerySchema = object({
  page: coerce.number().int().positive().default(1),
  limit: coerce.number().int().positive().max(100).default(20),
  status: zEnum(ORDER_STATUSES).optional(),
  paymentStatus: zEnum(PAYMENT_STATUSES).optional(),
  userId: string().cuid().optional(),
  search: string().max(100).optional(), // order number search
  sortOrder: zEnum(["asc", "desc"]).default("desc"),
});
