import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireMinRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import {
  brandIdParamSchema,
  brandsQuerySchema,
  createBrandSchema,
  updateBrandSchema,
} from "./brand.validation";
import * as brandController from "./brand.controller";

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get(
  "/",
  validate({ query: brandsQuerySchema }),
  brandController.getAllBrands
);

router.get(
  "/:id",
  validate({ params: brandIdParamSchema }),
  brandController.getBrandById
);

// ── Admin / Moderator ─────────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ body: createBrandSchema }),
  brandController.createBrand
);

router.patch(
  "/:id",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: brandIdParamSchema, body: updateBrandSchema }),
  brandController.updateBrand
);

router.delete(
  "/:id",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: brandIdParamSchema }),
  brandController.deleteBrand
);

export default router;
