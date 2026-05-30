import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as wishlistService from "./wishlist.service";

export const getMyWishlist = catchAsync(async (req: Request, res: Response) => {
  const items = await wishlistService.getMyWishlist(req.currentUser!.id);
  sendResponse({ res, statusCode: 200, success: true, message: "Wishlist fetched", data: items });
});

export const addToWishlist = catchAsync(async (req: Request, res: Response) => {
  const item = await wishlistService.addToWishlist(
    req.currentUser!.id,
    String(req.params.productId)
  );
  sendResponse({ res, statusCode: 201, success: true, message: "Added to wishlist", data: item });
});

export const removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
  await wishlistService.removeFromWishlist(
    req.currentUser!.id,
    String(req.params.productId)
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Removed from wishlist", data: null });
});

export const clearWishlist = catchAsync(async (req: Request, res: Response) => {
  await wishlistService.clearWishlist(req.currentUser!.id);
  sendResponse({ res, statusCode: 200, success: true, message: "Wishlist cleared", data: null });
});
