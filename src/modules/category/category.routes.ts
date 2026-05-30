import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireMinRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import {
  categoriesQuerySchema,
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.validation";
import * as categoryController from "./category.controller";

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get(
  "/",
  validate({ query: categoriesQuerySchema }),
  categoryController.getAllCategories
);

router.get(
  "/:id",
  validate({ params: categoryIdParamSchema }),
  categoryController.getCategoryById
);

// ── Admin / Moderator ─────────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ body: createCategorySchema }),
  categoryController.createCategory
);

router.patch(
  "/:id",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoryController.updateCategory
);

router.delete(
  "/:id",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: categoryIdParamSchema }),
  categoryController.deleteCategory
);

export default router;
