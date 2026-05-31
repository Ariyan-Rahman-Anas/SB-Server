import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as addressService from "./address.service";
import { StatusCodes } from "http-status-codes";

export const getMyAddresses = catchAsync(async (req: Request, res: Response) => {
  const addresses = await addressService.getMyAddresses(req.currentUser!.id);
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Addresses fetched", data: addresses });
});

export const createAddress = catchAsync(async (req: Request, res: Response) => {
  const address = await addressService.createAddress(req.currentUser!.id, req.body);
  sendResponse({ res, statusCode: StatusCodes.CREATED, success: true, message: "Address created", data: address });
});

export const updateAddress = catchAsync(async (req: Request, res: Response) => {
  const address = await addressService.updateAddress(
    String(req.params.id),
    req.currentUser!.id,
    req.body
  );
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Address updated", data: address });
});

export const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  await addressService.deleteAddress(String(req.params.id), req.currentUser!.id);
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Address deleted", data: null });
});

export const setPrimaryAddress = catchAsync(async (req: Request, res: Response) => {
  const address = await addressService.setPrimaryAddress(
    String(req.params.id),
    req.currentUser!.id
  );
  sendResponse({ res, statusCode: StatusCodes.OK, success: true, message: "Primary address set", data: address });
});
