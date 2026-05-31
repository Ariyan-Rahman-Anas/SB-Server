import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as categoryService from "./category.service";
import { StatusCodes } from "http-status-codes";

export const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const { categories, meta } = await categoryService.getAllCategories(req.query as never);
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Categories fetched", data: categories, meta });
});

export const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const category = await categoryService.getCategoryById(String(req.params.id));
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Category fetched", data: category });
});

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  sendResponse({ res, statusCode: StatusCodes.CREATED, success: true, message: "Category created", data: category });
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(String(req.params.id), req.body);
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Category updated", data: category });
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  await categoryService.deleteCategory(String(req.params.id));
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Category deleted", data: null });
});
