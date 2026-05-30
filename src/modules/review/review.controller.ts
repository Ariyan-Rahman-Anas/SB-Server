import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as reviewService from "./review.service";

const isAdmin = (req: Request) =>
  ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(req.currentUser?.role ?? "");

export const getReviews = catchAsync(async (req: Request, res: Response) => {
  const { reviews, meta } = await reviewService.getReviews(req.query as never);
  sendResponse({ res, statusCode: 200, success: true, message: "Reviews fetched", data: reviews, meta });
});

export const createReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewService.createReview(req.currentUser!.id, req.body);
  sendResponse({ res, statusCode: 201, success: true, message: "Review submitted", data: review });
});

export const updateReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewService.updateReview(
    String(req.params.id),
    req.currentUser!.id,
    req.body
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Review updated", data: review });
});

export const deleteReview = catchAsync(async (req: Request, res: Response) => {
  await reviewService.deleteReview(String(req.params.id), req.currentUser!.id, isAdmin(req));
  sendResponse({ res, statusCode: 200, success: true, message: "Review deleted", data: null });
});

export const toggleVerifyReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewService.toggleVerifyReview(String(req.params.id));
  sendResponse({
    res,
    statusCode: 200,
    success: true,
    message: `Review ${review.isVerified ? "verified" : "unverified"}`,
    data: review,
  });
});
