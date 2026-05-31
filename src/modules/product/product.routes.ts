import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { optionalAuth } from "../../middleware/requireAuth";
import { requireMinRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import { z } from "zod";
import {
  createProductSchema,
  productIdParamSchema,
  productsQuerySchema,
  updateProductSchema,
} from "./product.validation";
import * as productController from "./product.controller";

const router = Router();

// ── Public 
router.get(
  "/",
  optionalAuth,
  validate({ query: productsQuerySchema }),
  productController.getAllProducts
);

router.get(
  "/slug/:slug",
  validate({ params: z.object({ slug: z.string().min(1) }) }),
  productController.getProductBySlug
);

router.get(
  "/:id",
  optionalAuth,
  validate({ params: productIdParamSchema }),
  productController.getProductById
);

// ── Moderator / Admin 
router.post(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ body: createProductSchema }),
  productController.createProduct
);

router.patch(
  "/:id",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productController.updateProduct
);

router.patch(
  "/:id/status",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({
    params: productIdParamSchema,
    body: z.object({
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    }),
  }),
  productController.updateProductStatus
);

router.delete(
  "/:id",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: productIdParamSchema }),
  productController.deleteProduct
);

export default router;
