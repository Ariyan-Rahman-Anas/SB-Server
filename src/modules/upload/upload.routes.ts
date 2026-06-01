import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireMinRole } from "../../middleware/requireRole";
import { upload, uploadImage, deleteImages } from "./upload.controller";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  upload.single("image"),
  uploadImage
);

router.delete(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  deleteImages
);

export default router;
