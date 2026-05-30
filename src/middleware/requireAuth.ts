import { Request, Response, NextFunction } from "express";
import { auth } from "../auth/auth";
import { fromNodeHeaders } from "better-auth/node";
import { AppError } from "../utils/AppError";

/**
 * Extend Express Request to carry the authenticated user & session.
 */
declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        email: string;
        name: string;
        role: string;
        emailVerified: boolean;
        image?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
        countryCode?: string | null;
        isActive?: boolean;
      };
      currentSession?: {
        id: string;
        token: string;
        userId: string;
        expiresAt: Date;
      };
    }
  }
}

/**
 * Validates the session token and attaches user to req.currentUser.
 * Returns 401 if not authenticated.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user || !session?.session) {
      throw new AppError("Unauthorized — please sign in", 401);
    }

    // Check if user account is still active
    if ((session.user as { isActive?: boolean }).isActive === false) {
      throw new AppError("Your account has been deactivated. Please contact support.", 403);
    }

    req.currentUser = session.user as unknown as Request["currentUser"];
    req.currentSession = session.session as unknown as Request["currentSession"];

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optionally loads the session without throwing on missing auth.
 * Useful for routes that work for both guests and authenticated users.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session?.user) {
      req.currentUser = session.user as unknown as Request["currentUser"];
      req.currentSession = session.session as unknown as Request["currentSession"];
    }
  } catch {
    // Silently ignore — guest access is allowed
  }
  next();
};
