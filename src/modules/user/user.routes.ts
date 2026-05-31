import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireMinRole, requireRole } from "../../middleware/requireRole";
import { validate } from "../../middleware/validate";
import {
  getUsersQuerySchema,
  idParamSchema,
  updateProfileSchema,
  updateUserRoleSchema,
} from "./user.validation";
import * as userController from "./user.controller";

const router = Router();

// ── Current user 
router
  .route("/me")
  .get(requireAuth, userController.getMyProfile)
  .patch(
    requireAuth,
    validate({ body: updateProfileSchema }),
    userController.updateMyProfile
  );

// ── Admin routes 
router.get(
  "/",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ query: getUsersQuerySchema }),
  userController.getAllUsers
);

router.get(
  "/:id",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: idParamSchema }),
  userController.getUserById
);

router.patch(
  "/:id/role",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  validate({ params: idParamSchema, body: updateUserRoleSchema }),
  userController.updateUserRole
);

router.patch(
  "/:id/toggle-active",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: idParamSchema }),
  userController.toggleUserActive
);

export default router;
