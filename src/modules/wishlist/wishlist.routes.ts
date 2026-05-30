import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { validate } from "../../middleware/validate";
import { wishlistItemParamSchema } from "./wishlist.validation";
import * as wishlistController from "./wishlist.controller";

const router = Router();

// All wishlist routes require authentication
router.use(requireAuth);

router.get("/", wishlistController.getMyWishlist);
router.delete("/clear", wishlistController.clearWishlist);

router.post(
  "/:productId",
  validate({ params: wishlistItemParamSchema }),
  wishlistController.addToWishlist
);

router.delete(
  "/:productId",
  validate({ params: wishlistItemParamSchema }),
  wishlistController.removeFromWishlist
);

export default router;
