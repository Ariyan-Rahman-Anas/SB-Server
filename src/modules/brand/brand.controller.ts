import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as brandService from "./brand.service";
import { StatusCodes } from "http-status-codes";

export const getAllBrands = catchAsync(async (req: Request, res: Response) => {
  const { brands, meta } = await brandService.getAllBrands(req.query as never);
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Brands fetched", data: brands, meta });
});

export const getBrandById = catchAsync(async (req: Request, res: Response) => {
  const brand = await brandService.getBrandById(String(req.params.id));
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Brand fetched", data: brand });
});

export const createBrand = catchAsync(async (req: Request, res: Response) => {
  const brand = await brandService.createBrand(req.body);
  sendResponse({ res, statusCode: StatusCodes.CREATED, success: true, message: "Brand created", data: brand });
});

export const updateBrand = catchAsync(async (req: Request, res: Response) => {
  const brand = await brandService.updateBrand(String(req.params.id), req.body);
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Brand updated", data: brand });
});

export const deleteBrand = catchAsync(async (req: Request, res: Response) => {
  await brandService.deleteBrand(String(req.params.id));
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Brand deleted", data: null });
});
