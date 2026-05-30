import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as productService from "./product.service";

const isAdmin = (req: Request) =>
  ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(req.currentUser?.role ?? "");

export const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const { products, meta } = await productService.getAllProducts(
    req.query as never,
    isAdmin(req)
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Products fetched", data: products, meta });
});

export const getProductById = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.getProductById(String(req.params.id), isAdmin(req));
  sendResponse({ res, statusCode: 200, success: true, message: "Product fetched", data: product });
});

export const getProductBySlug = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.getProductBySlug(String(req.params.slug));
  sendResponse({ res, statusCode: 200, success: true, message: "Product fetched", data: product });
});

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  sendResponse({ res, statusCode: 201, success: true, message: "Product created", data: product });
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(String(req.params.id), req.body);
  sendResponse({ res, statusCode: 200, success: true, message: "Product updated", data: product });
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await productService.deleteProduct(String(req.params.id));
  sendResponse({ res, statusCode: 200, success: true, message: "Product deleted", data: null });
});

export const updateProductStatus = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProductStatus(
    String(req.params.id),
    req.body.status
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Product status updated", data: product });
});
