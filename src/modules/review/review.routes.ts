import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireMinRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import {
  createReviewSchema,
  reviewIdParamSchema,
  reviewsQuerySchema,
  updateReviewSchema,
} from "./review.validation";
import * as reviewController from "./review.controller";

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get(
  "/",
  validate({ query: reviewsQuerySchema }),
  reviewController.getReviews
);

// ── Authenticated customers ───────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  validate({ body: createReviewSchema }),
  reviewController.createReview
);

router.patch(
  "/:id",
  requireAuth,
  validate({ params: reviewIdParamSchema, body: updateReviewSchema }),
  reviewController.updateReview
);

router.delete(
  "/:id",
  requireAuth,
  validate({ params: reviewIdParamSchema }),
  reviewController.deleteReview
);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/verify",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: reviewIdParamSchema }),
  reviewController.toggleVerifyReview
);

export default router;
