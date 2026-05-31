import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { StatusCodes } from "http-status-codes";

// Role hierarchy — higher index = more privilege
const ROLE_HIERARCHY = ["CUSTOMER", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof ROLE_HIERARCHY)[number];

/**
 * RBAC middleware factory.
 * Usage: requireRole("ADMIN")        — exact roles
 *        requireRole("MODERATOR", true) — MODERATOR or higher
 */
export const requireRole =
  (...allowedRoles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.currentUser;

    if (!user) {
      return next(new AppError("Unauthorized — please sign in", StatusCodes.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(user.role as Role)) {
      return next(
        new AppError(
          `Forbidden — requires one of: ${allowedRoles.join(", ")}`,
          StatusCodes.FORBIDDEN
        )
      );
    }

    next();
  };

/**
 * Allows users with the given role OR a higher role.
 * e.g. requireMinRole("MODERATOR") allows MODERATOR, ADMIN, SUPER_ADMIN
 */
export const requireMinRole =
  (minRole: Role) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.currentUser;

    if (!user) {
      return next(new AppError("Unauthorized — please sign in", StatusCodes.UNAUTHORIZED));
    }

    const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role as Role);
    const minRoleIndex = ROLE_HIERARCHY.indexOf(minRole);

    if (userRoleIndex < minRoleIndex) {
      return next(
        new AppError(
          `Forbidden — requires at least ${minRole} role`,
          StatusCodes.FORBIDDEN
        )
      );
    }

    next();
  };

/**
 * Ensures the current user can only access their own resource,
 * unless they are ADMIN or SUPER_ADMIN.
 */
export const requireOwnerOrAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const user = req.currentUser;
  const resourceUserId = req.params.userId ?? req.params.id;

  if (!user) {
    return next(new AppError("Unauthorized — please sign in", StatusCodes.UNAUTHORIZED));
  }

  const isAdminOrAbove =
    ROLE_HIERARCHY.indexOf(user.role as Role) >=
    ROLE_HIERARCHY.indexOf("ADMIN");

  if (!isAdminOrAbove && user.id !== resourceUserId) {
    return next(new AppError("Forbidden — access denied", StatusCodes.FORBIDDEN));
  }

  next();
};
