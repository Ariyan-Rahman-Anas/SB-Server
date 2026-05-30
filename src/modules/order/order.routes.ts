import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { optionalAuth } from "../../middleware/requireAuth";
import { requireMinRole } from "../../middleware/requireRole";
import { writeLimiter } from "../../middleware/rateLimiter";
import { validate } from "../../middleware/validate";
import {
  createOrderSchema,
  orderIdParamSchema,
  ordersQuerySchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from "./order.validation";
import * as orderController from "./order.controller";

const router = Router();

// ── Customer / Guest ──────────────────────────────────────────────────────────
router.post(
  "/",
  optionalAuth,
  writeLimiter,
  validate({ body: createOrderSchema }),
  orderController.createOrder
);

router.get(
  "/my-orders",
  requireAuth,
  validate({ query: ordersQuerySchema }),
  orderController.getMyOrders
);

router.get(
  "/:id",
  requireAuth,
  validate({ params: orderIdParamSchema }),
  orderController.getOrderById
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ query: ordersQuerySchema }),
  orderController.getAllOrders
);

router.patch(
  "/:id/status",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  orderController.updateOrderStatus
);

router.patch(
  "/:id/payment-status",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: orderIdParamSchema, body: updatePaymentStatusSchema }),
  orderController.updatePaymentStatus
);

export default router;
