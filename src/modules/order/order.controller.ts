import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as orderService from "./order.service";

const isAdmin = (req: Request) =>
  ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(req.currentUser?.role ?? "");

export const createOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.body, req.currentUser?.id);
  sendResponse({ res, statusCode: 201, success: true, message: "Order placed successfully", data: order });
});

export const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const { orders, meta } = await orderService.getMyOrders(
    req.currentUser!.id,
    req.query as never
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Orders fetched", data: orders, meta });
});

export const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(
    String(req.params.id),
    req.currentUser?.id,
    isAdmin(req)
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Order fetched", data: order });
});

export const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const { orders, meta } = await orderService.getAllOrders(req.query as never);
  sendResponse({ res, statusCode: 200, success: true, message: "All orders fetched", data: orders, meta });
});

export const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.updateOrderStatus(String(req.params.id), req.body);
  sendResponse({ res, statusCode: 200, success: true, message: "Order status updated", data: order });
});

export const updatePaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.updatePaymentStatus(String(req.params.id), req.body);
  sendResponse({ res, statusCode: 200, success: true, message: "Payment status updated", data: order });
});
