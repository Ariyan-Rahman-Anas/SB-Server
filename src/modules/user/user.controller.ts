import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import * as userService from "./user.service";

export const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getMyProfile(req.currentUser!.id);
  sendResponse({ res, statusCode: 200, success: true, message: "Profile fetched", data: user });
});

export const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.updateMyProfile(req.currentUser!.id, req.body);
  sendResponse({ res, statusCode: 200, success: true, message: "Profile updated", data: user });
});

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const { users, meta } = await userService.getAllUsers(req.query as never);
  sendResponse({ res, statusCode: 200, success: true, message: "Users fetched", data: users, meta });
});

export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getUserById(String(req.params.id));
  sendResponse({ res, statusCode: 200, success: true, message: "User fetched", data: user });
});

export const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.updateUserRole(
    String(req.params.id),
    req.body,
    req.currentUser!.id
  );
  sendResponse({ res, statusCode: 200, success: true, message: "User role updated", data: user });
});

export const toggleUserActive = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.toggleUserActive(
    String(req.params.id),
    req.currentUser!.id
  );
  sendResponse({
    res,
    statusCode: 200,
    success: true,
    message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
    data: user,
  });
});
