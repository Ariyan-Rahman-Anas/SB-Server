import { Request, Response, NextFunction } from "express";
import multer from "multer";
import streamifier from "streamifier";
import cloudinary from "../../lib/cloudinary";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";
import { sendResponse } from "../../utils/sendResponse";

// Memory storage — no disk writes
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// POST /api/upload — single image
export const uploadImage = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.file) throw new AppError("No image file provided", 400);

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "shine-bright/products", resource_type: "image" },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Upload failed"));
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        streamifier.createReadStream(req.file!.buffer).pipe(stream);
      }
    );

    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Image uploaded successfully",
      data: { url: result.secure_url, publicId: result.public_id },
    });
  }
);

// DELETE /api/upload — rollback one or more images
export const deleteImages = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { publicIds } = req.body as { publicIds: string[] };
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new AppError("publicIds array is required", 400);
    }

    await Promise.all(
      publicIds.map((id) =>
        cloudinary.uploader.destroy(id, { resource_type: "image" })
      )
    );

    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Images deleted (rollback done)",
    });
  }
);
