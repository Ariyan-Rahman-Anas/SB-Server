// src/app.ts
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";

// src/config/env.ts
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5e3),
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  // Resend
  RESEND_API_KEY: z.string().startsWith("re_", "Invalid Resend API key"),
  RESEND_EMAIL_FROM: z.string().min(1, "RESEND_EMAIL_FROM is required"),
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  // CORS
  CLIENT_URL: z.string().url("CLIENT_URL must be a valid URL"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000").transform((val) => val.split(",").map((o) => o.trim()))
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  const message = Object.entries(errors).map(([k, v]) => `${k}: ${v?.join(", ")}`).join(" | ");
  throw new Error(`\u274C Invalid environment variables \u2014 ${message}`);
}
var env = parsed.data;

// src/auth/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
var globalForPrisma = globalThis;
var db = globalForPrisma.prisma ?? new PrismaClient({
  log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// src/lib/resend.ts
import { Resend } from "resend";
var resend = new Resend(env.RESEND_API_KEY);

// src/auth/email-templates.ts
var baseStyle = `
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  background-color: #f9f9f9;
  padding: 40px 20px;
`;
var cardStyle = `
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
`;
var headerStyle = `
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 32px 40px;
  text-align: center;
`;
var bodyStyle = `
  padding: 40px;
  color: #374151;
  line-height: 1.6;
`;
var buttonStyle = `
  display: inline-block;
  background: #e91e8c;
  color: #ffffff !important;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  margin: 24px 0;
`;
var footerStyle = `
  padding: 24px 40px;
  background: #f3f4f6;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
`;
var logo = `
  <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:1px;">
    Shine Bright \u2728
  </h1>
`;
var verificationEmailHtml = (name, url) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">${logo}</div>
    <div style="${bodyStyle}">
      <h2 style="color:#1a1a2e; margin-top:0;">Verify your email address</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Click the button below to verify your email address and activate your Shine Bright account.</p>
      <div style="text-align:center;">
        <a href="${url}" style="${buttonStyle}">Verify Email</a>
      </div>
      <p style="color:#6b7280; font-size:13px;">
        This link expires in <strong>24 hours</strong>. If you didn't create a Shine Bright account, you can safely ignore this email.
      </p>
      <p style="color:#6b7280; font-size:12px; word-break:break-all;">
        Or copy this URL: <a href="${url}" style="color:#e91e8c;">${url}</a>
      </p>
    </div>
    <div style="${footerStyle}">
      &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Shine Bright. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
var passwordResetEmailHtml = (name, url) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">${logo}</div>
    <div style="${bodyStyle}">
      <h2 style="color:#1a1a2e; margin-top:0;">Reset your password</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to choose a new password.</p>
      <div style="text-align:center;">
        <a href="${url}" style="${buttonStyle}">Reset Password</a>
      </div>
      <p style="color:#6b7280; font-size:13px;">
        This link expires in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email \u2014 your account is safe.
      </p>
      <p style="color:#6b7280; font-size:12px; word-break:break-all;">
        Or copy this URL: <a href="${url}" style="color:#e91e8c;">${url}</a>
      </p>
    </div>
    <div style="${footerStyle}">
      &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Shine Bright. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
var orderConfirmationEmailHtml = (name, orderNumber, total) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">${logo}</div>
    <div style="${bodyStyle}">
      <h2 style="color:#1a1a2e; margin-top:0;">Order Confirmed! \u{1F38A}</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your order has been successfully placed. Here's your summary:</p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr>
          <td style="padding:10px 0; color:#6b7280; font-size:14px;">Order Number</td>
          <td style="padding:10px 0; font-weight:600; text-align:right;">${orderNumber}</td>
        </tr>
        <tr style="border-top:1px solid #e5e7eb;">
          <td style="padding:10px 0; color:#6b7280; font-size:14px;">Total Amount</td>
          <td style="padding:10px 0; font-weight:700; color:#e91e8c; text-align:right;">\u09F3${total}</td>
        </tr>
      </table>
      <div style="text-align:center;">
        <a href="${env.CLIENT_URL}/orders" style="${buttonStyle}">Track Order</a>
      </div>
      <p style="color:#6b7280; font-size:14px;">
        Thank you for shopping with Shine Bright. We'll notify you when your order is on its way!
      </p>
    </div>
    <div style="${footerStyle}">
      &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Shine Bright. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

// src/auth/auth.ts
var auth = betterAuth({
  // ── Core 
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.ALLOWED_ORIGINS,
  // ── Database 
  database: prismaAdapter(db, {
    provider: "postgresql"
  }),
  // ── Email & Password 
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url, token }) => {
      const frontendResetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
      await resend.emails.send({
        from: env.RESEND_EMAIL_FROM,
        to: user.email,
        subject: "Reset your password \u2014 Shine Bright",
        html: passwordResetEmailHtml(user.name, frontendResetUrl)
      });
    }
  },
  // ── Email Verification 
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: env.RESEND_EMAIL_FROM,
        to: user.email,
        subject: "Verify your email \u2014 Shine Bright",
        html: verificationEmailHtml(user.name, url)
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24
    // 24 hours
  },
  // ── Social Providers 
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    }
  },
  // ── User Additional Fields 
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CUSTOMER",
        input: false
        // not user-settable via API
      },
      firstName: {
        type: "string",
        required: false
      },
      lastName: {
        type: "string",
        required: false
      },
      phone: {
        type: "string",
        required: false
      },
      countryCode: {
        type: "string",
        defaultValue: "+880",
        required: false
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        input: false
      }
    }
  },
  // ── Session 
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    // 7 days
    updateAge: 60 * 60 * 24,
    // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5
      // cache cookie for 5 min
    }
  },
  // ── Built-in Rate Limiting (for auth routes only) 
  rateLimit: {
    enabled: true,
    window: 60,
    // seconds
    max: 20,
    customRules: {
      "/sign-in/email": {
        window: 60 * 15,
        // 15 min
        max: 5
      },
      "/forget-password": {
        window: 60 * 15,
        max: 3
      },
      "/sign-up/email": {
        window: 60 * 60,
        max: 10
      }
    }
  },
  // ── Advanced Cookie Settings
  // In production, client (s-bright.vercel.app) and server (api-sbright.vercel.app)
  // are on different domains. The OAuth state cookie is set during a cross-origin
  // fetch. Browsers only store/send cross-site cookies when SameSite=None; Secure.
  // Without this, the state cookie is dropped → state_mismatch on Google callback.
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      path: "/"
    }
  }
  // ── Hooks
  // Welcome email: best sent from the user registration endpoint directly
  // or via a database trigger — not via better-auth hooks (ctx shape varies).
});

// src/middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";
var createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message },
  skipSuccessfulRequests: false
});
var apiRateLimiter = createLimiter(
  20 * 60 * 1e3,
  100,
  "Too many requests \u2014 please try again after some time."
);
var writeLimiter = createLimiter(
  15 * 60 * 1e3,
  30,
  "Too many requests \u2014 please slow down."
);

// src/middleware/errorHandler.ts
import { ZodError } from "zod";

// src/utils/AppError.ts
var AppError = class _AppError extends Error {
  statusCode;
  isOperational;
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    Object.setPrototypeOf(this, _AppError.prototype);
  }
};

// src/middleware/errorHandler.ts
import { StatusCodes } from "http-status-codes";
var globalErrorHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
    return;
  }
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message
    }));
    res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: "Validation failed",
      errors
    });
    return;
  }
  if (typeof err === "object" && err !== null && "code" in err) {
    const prismaError = err;
    if (prismaError.code === "P2002") {
      const field = prismaError.meta?.target?.[0] ?? "field";
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: `A record with this ${field} already exists.`
      });
      return;
    }
    if (prismaError.code === "P2025") {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Record not found."
      });
      return;
    }
  }
  console.error("\u{1F534} Unhandled error:", err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Internal server error",
    ...env.NODE_ENV === "development" && {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : void 0
    }
  });
};
var notFoundHandler = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

// src/routes/index.ts
import { Router as Router10 } from "express";

// src/modules/user/user.routes.ts
import { Router } from "express";

// src/middleware/requireAuth.ts
import { fromNodeHeaders } from "better-auth/node";
import { StatusCodes as StatusCodes2 } from "http-status-codes";
var requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });
    if (!session?.user || !session?.session) {
      throw new AppError("Unauthorized \u2014 please sign in", StatusCodes2.UNAUTHORIZED);
    }
    if (session.user.isActive === false) {
      throw new AppError("Your account has been deactivated. Please contact support.", StatusCodes2.FORBIDDEN);
    }
    req.currentUser = session.user;
    req.currentSession = session.session;
    next();
  } catch (error) {
    next(error);
  }
};
var optionalAuth = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });
    if (session?.user) {
      req.currentUser = session.user;
      req.currentSession = session.session;
    }
  } catch {
  }
  next();
};

// src/middleware/requireRole.ts
import { StatusCodes as StatusCodes3 } from "http-status-codes";
var ROLE_HIERARCHY = ["CUSTOMER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
var requireRole = (...allowedRoles) => (req, _res, next) => {
  const user = req.currentUser;
  if (!user) {
    return next(new AppError("Unauthorized \u2014 please sign in", StatusCodes3.UNAUTHORIZED));
  }
  if (!allowedRoles.includes(user.role)) {
    return next(
      new AppError(
        `Forbidden \u2014 requires one of: ${allowedRoles.join(", ")}`,
        StatusCodes3.FORBIDDEN
      )
    );
  }
  next();
};
var requireMinRole = (minRole) => (req, _res, next) => {
  const user = req.currentUser;
  if (!user) {
    return next(new AppError("Unauthorized \u2014 please sign in", StatusCodes3.UNAUTHORIZED));
  }
  const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
  const minRoleIndex = ROLE_HIERARCHY.indexOf(minRole);
  if (userRoleIndex < minRoleIndex) {
    return next(
      new AppError(
        `Forbidden \u2014 requires at least ${minRole} role`,
        StatusCodes3.FORBIDDEN
      )
    );
  }
  next();
};

// src/middleware/validate.ts
import { ZodError as ZodError2 } from "zod";
var validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    next();
  } catch (err) {
    if (err instanceof ZodError2) {
      const errors = err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message
      }));
      res.status(422).json({
        success: false,
        message: "Validation failed",
        errors
      });
      return;
    }
    next(err);
  }
};

// src/modules/user/user.validation.ts
import { string, object, enum as zEnum, coerce } from "zod";
var ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR", "CUSTOMER"];
var updateProfileSchema = object({
  name: string().min(2, "Name must be at least 2 characters").max(100).optional(),
  firstName: string().min(1).max(50).optional(),
  lastName: string().max(50).optional(),
  phone: string().regex(/^\d{7,15}$/, "Invalid phone number").optional(),
  countryCode: string().regex(/^\+\d{1,4}$/, "Invalid country code").optional(),
  image: string().url("Invalid image URL").optional()
});
var updateUserRoleSchema = object({
  role: zEnum(ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ROLES.join(", ")}` })
  })
});
var getUsersQuerySchema = object({
  page: coerce.number().int().positive().default(1),
  limit: coerce.number().int().positive().max(100).default(20),
  search: string().max(100).optional(),
  role: zEnum(ROLES).optional(),
  isActive: string().optional().transform((val) => {
    if (val === "true") return true;
    if (val === "false") return false;
    return void 0;
  })
});
var idParamSchema = object({
  id: string().cuid("Invalid ID format")
});

// src/utils/catchAsync.ts
var catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

// src/utils/sendResponse.ts
var sendResponse = ({
  res,
  statusCode,
  success,
  message,
  data,
  meta
}) => {
  res.status(statusCode).json({
    success,
    message,
    ...meta && { meta },
    ...data !== void 0 && { data }
  });
};

// src/utils/helpers.ts
var slugify = (str) => str.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
var generateOrderNumber = () => {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SB-${Date.now()}-${random}`;
};
var generateProductCode = () => {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PC-${Date.now()}${random}`;
};
var buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit)
});
var parsePagination = (pageStr, limitStr, maxLimit = 100) => {
  const page = Math.max(1, parseInt(String(pageStr ?? 1), 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(String(limitStr ?? 20), 10) || 20)
  );
  return { page, limit, skip: (page - 1) * limit };
};

// src/modules/user/user.service.ts
var getMyProfile = async (userId) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      firstName: true,
      lastName: true,
      phone: true,
      countryCode: true,
      role: true,
      isActive: true,
      createdAt: true,
      addresses: {
        orderBy: { isPrimary: "desc" }
      }
    }
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
};
var updateMyProfile = async (userId, data) => {
  return db.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      firstName: true,
      lastName: true,
      phone: true,
      countryCode: true,
      role: true,
      updatedAt: true
    }
  });
};
var getAllUsers = async (query) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = {
    ...query.search && {
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } }
      ]
    },
    ...query.role && { role: query.role },
    ...query.isActive !== void 0 && { isActive: query.isActive }
  };
  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    }),
    db.user.count({ where })
  ]);
  return { users, meta: buildPaginationMeta(total, page, limit) };
};
var getUserById = async (id) => {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      firstName: true,
      lastName: true,
      phone: true,
      countryCode: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      addresses: { orderBy: { isPrimary: "desc" } },
      _count: { select: { orders: true, reviews: true } }
    }
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
};
var updateUserRole = async (id, data, requesterId) => {
  if (id === requesterId) {
    throw new AppError("You cannot change your own role", 400);
  }
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found", 404);
  return db.user.update({
    where: { id },
    data: { role: data.role },
    select: { id: true, email: true, role: true }
  });
};
var toggleUserActive = async (id, requesterId) => {
  if (id === requesterId) {
    throw new AppError("You cannot deactivate your own account", 400);
  }
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new AppError("User not found", 404);
  return db.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, isActive: true }
  });
};

// src/modules/user/user.controller.ts
var getMyProfile2 = catchAsync(async (req, res) => {
  const user = await getMyProfile(req.currentUser.id);
  sendResponse({ res, statusCode: 200, success: true, message: "Profile fetched", data: user });
});
var updateMyProfile2 = catchAsync(async (req, res) => {
  const user = await updateMyProfile(req.currentUser.id, req.body);
  sendResponse({ res, statusCode: 200, success: true, message: "Profile updated", data: user });
});
var getAllUsers2 = catchAsync(async (req, res) => {
  const { users, meta } = await getAllUsers(req.query);
  sendResponse({ res, statusCode: 200, success: true, message: "Users fetched", data: users, meta });
});
var getUserById2 = catchAsync(async (req, res) => {
  const user = await getUserById(String(req.params.id));
  sendResponse({ res, statusCode: 200, success: true, message: "User fetched", data: user });
});
var updateUserRole2 = catchAsync(async (req, res) => {
  const user = await updateUserRole(
    String(req.params.id),
    req.body,
    req.currentUser.id
  );
  sendResponse({ res, statusCode: 200, success: true, message: "User role updated", data: user });
});
var toggleUserActive2 = catchAsync(async (req, res) => {
  const user = await toggleUserActive(
    String(req.params.id),
    req.currentUser.id
  );
  sendResponse({
    res,
    statusCode: 200,
    success: true,
    message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
    data: user
  });
});

// src/modules/user/user.routes.ts
var router = Router();
router.route("/me").get(requireAuth, getMyProfile2).patch(
  requireAuth,
  validate({ body: updateProfileSchema }),
  updateMyProfile2
);
router.get(
  "/",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ query: getUsersQuerySchema }),
  getAllUsers2
);
router.get(
  "/:id",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: idParamSchema }),
  getUserById2
);
router.patch(
  "/:id/role",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  validate({ params: idParamSchema, body: updateUserRoleSchema }),
  updateUserRole2
);
router.patch(
  "/:id/toggle-active",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: idParamSchema }),
  toggleUserActive2
);
var user_routes_default = router;

// src/modules/address/address.routes.ts
import { Router as Router2 } from "express";

// src/modules/address/address.validation.ts
import { string as string2, enum as zEnum2, boolean, object as object2 } from "zod";
var ADDRESS_TYPES = ["HOME", "OFFICE", "OTHER"];
var createAddressSchema = object2({
  addressType: zEnum2(ADDRESS_TYPES).default("HOME"),
  address: string2().min(5, "Address must be at least 5 characters").max(255),
  city: string2().min(2, "City is required").max(100),
  countryCode: string2().regex(/^\+\d{1,4}$/, "Invalid country code").default("+880"),
  isPrimary: boolean().default(false)
});
var updateAddressSchema = createAddressSchema.partial();
var addressIdParamSchema = object2({
  id: string2().cuid("Invalid address ID")
});

// src/modules/address/address.service.ts
var getMyAddresses = async (userId) => {
  return db.address.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }]
  });
};
var createAddress = async (userId, data) => {
  return db.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.address.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false }
      });
    }
    return tx.address.create({ data: { ...data, userId } });
  });
};
var updateAddress = async (id, userId, data) => {
  const address = await db.address.findUnique({ where: { id } });
  if (!address) throw new AppError("Address not found", 404);
  if (address.userId !== userId) throw new AppError("Forbidden", 403);
  return db.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.address.updateMany({
        where: { userId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false }
      });
    }
    return tx.address.update({ where: { id }, data });
  });
};
var deleteAddress = async (id, userId) => {
  const address = await db.address.findUnique({ where: { id } });
  if (!address) throw new AppError("Address not found", 404);
  if (address.userId !== userId) throw new AppError("Forbidden", 403);
  if (address.isPrimary)
    throw new AppError("Cannot delete your primary address", 400);
  return db.address.delete({ where: { id } });
};
var setPrimaryAddress = async (id, userId) => {
  const address = await db.address.findUnique({ where: { id } });
  if (!address) throw new AppError("Address not found", 404);
  if (address.userId !== userId) throw new AppError("Forbidden", 403);
  return db.$transaction(async (tx) => {
    await tx.address.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false }
    });
    return tx.address.update({
      where: { id },
      data: { isPrimary: true }
    });
  });
};

// src/modules/address/address.controller.ts
import { StatusCodes as StatusCodes4 } from "http-status-codes";
var getMyAddresses2 = catchAsync(async (req, res) => {
  const addresses = await getMyAddresses(req.currentUser.id);
  sendResponse({ res, statusCode: StatusCodes4.OK, success: true, message: "Addresses fetched", data: addresses });
});
var createAddress2 = catchAsync(async (req, res) => {
  const address = await createAddress(req.currentUser.id, req.body);
  sendResponse({ res, statusCode: StatusCodes4.CREATED, success: true, message: "Address created", data: address });
});
var updateAddress2 = catchAsync(async (req, res) => {
  const address = await updateAddress(
    String(req.params.id),
    req.currentUser.id,
    req.body
  );
  sendResponse({ res, statusCode: StatusCodes4.OK, success: true, message: "Address updated", data: address });
});
var deleteAddress2 = catchAsync(async (req, res) => {
  await deleteAddress(String(req.params.id), req.currentUser.id);
  sendResponse({ res, statusCode: StatusCodes4.OK, success: true, message: "Address deleted", data: null });
});
var setPrimaryAddress2 = catchAsync(async (req, res) => {
  const address = await setPrimaryAddress(
    String(req.params.id),
    req.currentUser.id
  );
  sendResponse({ res, statusCode: StatusCodes4.OK, success: true, message: "Primary address set", data: address });
});

// src/modules/address/address.routes.ts
var router2 = Router2();
router2.use(requireAuth);
router2.route("/").get(getMyAddresses2).post(validate({ body: createAddressSchema }), createAddress2);
router2.route("/:id").patch(
  validate({ params: addressIdParamSchema, body: updateAddressSchema }),
  updateAddress2
).delete(
  validate({ params: addressIdParamSchema }),
  deleteAddress2
);
router2.patch(
  "/:id/set-primary",
  validate({ params: addressIdParamSchema }),
  setPrimaryAddress2
);
var address_routes_default = router2;

// src/modules/brand/brand.routes.ts
import { Router as Router3 } from "express";

// src/modules/brand/brand.validation.ts
import { string as string3, object as object3, boolean as boolean2, coerce as coerce2 } from "zod";
var createBrandSchema = object3({
  name: string3().min(1, "Brand name is required").max(100),
  slug: string3().min(1).max(120).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes").optional(),
  logo: string3().url("Logo must be a valid URL").optional(),
  isActive: boolean2().default(true)
});
var updateBrandSchema = createBrandSchema.partial();
var brandIdParamSchema = object3({
  id: string3().cuid("Invalid brand ID")
});
var brandsQuerySchema = object3({
  page: coerce2.number().int().positive().default(1),
  limit: coerce2.number().int().positive().max(100).default(20),
  search: string3().max(100).optional(),
  isActive: string3().optional().transform(
    (v) => v === "true" ? true : v === "false" ? false : void 0
  )
});

// src/modules/brand/brand.service.ts
import { StatusCodes as StatusCodes5 } from "http-status-codes";
var getAllBrands = async (query) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = {
    ...query.search && {
      name: { contains: query.search, mode: "insensitive" }
    },
    ...query.isActive !== void 0 && { isActive: query.isActive }
  };
  const [brands, total] = await Promise.all([
    db.brand.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } }
    }),
    db.brand.count({ where })
  ]);
  return { brands, meta: buildPaginationMeta(total, page, limit) };
};
var getBrandById = async (id) => {
  const brand = await db.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } }
  });
  if (!brand) throw new AppError("Brand not found", StatusCodes5.NOT_FOUND);
  return brand;
};
var createBrand = async (data) => {
  const slug = data.slug ?? slugify(data.name);
  const existing = await db.brand.findFirst({
    where: { OR: [{ name: data.name }, { slug }] }
  });
  if (existing) throw new AppError("A brand with this name or slug already exists", StatusCodes5.CONFLICT);
  return db.brand.create({ data: { ...data, slug } });
};
var updateBrand = async (id, data) => {
  const brand = await db.brand.findUnique({ where: { id } });
  if (!brand) throw new AppError("Brand not found", StatusCodes5.NOT_FOUND);
  const slug = data.name && !data.slug ? slugify(data.name) : data.slug;
  return db.brand.update({
    where: { id },
    data: { ...data, ...slug && { slug } }
  });
};
var deleteBrand = async (id) => {
  const brand = await db.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } }
  });
  if (!brand) throw new AppError("Brand not found", StatusCodes5.NOT_FOUND);
  if (brand._count.products > 0)
    throw new AppError(
      `Cannot delete brand \u2014 it has ${brand._count.products} associated products`,
      StatusCodes5.BAD_REQUEST
    );
  return db.brand.delete({ where: { id } });
};

// src/modules/brand/brand.controller.ts
import { StatusCodes as StatusCodes6 } from "http-status-codes";
var getAllBrands2 = catchAsync(async (req, res) => {
  const { brands, meta } = await getAllBrands(req.query);
  sendResponse({ res, statusCode: StatusCodes6.OK, success: true, message: "Brands fetched", data: brands, meta });
});
var getBrandById2 = catchAsync(async (req, res) => {
  const brand = await getBrandById(String(req.params.id));
  sendResponse({ res, statusCode: StatusCodes6.OK, success: true, message: "Brand fetched", data: brand });
});
var createBrand2 = catchAsync(async (req, res) => {
  const brand = await createBrand(req.body);
  sendResponse({ res, statusCode: StatusCodes6.CREATED, success: true, message: "Brand created", data: brand });
});
var updateBrand2 = catchAsync(async (req, res) => {
  const brand = await updateBrand(String(req.params.id), req.body);
  sendResponse({ res, statusCode: StatusCodes6.OK, success: true, message: "Brand updated", data: brand });
});
var deleteBrand2 = catchAsync(async (req, res) => {
  await deleteBrand(String(req.params.id));
  sendResponse({ res, statusCode: StatusCodes6.OK, success: true, message: "Brand deleted", data: null });
});

// src/modules/brand/brand.routes.ts
var router3 = Router3();
router3.get(
  "/",
  validate({ query: brandsQuerySchema }),
  getAllBrands2
);
router3.get(
  "/:id",
  validate({ params: brandIdParamSchema }),
  getBrandById2
);
router3.post(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ body: createBrandSchema }),
  createBrand2
);
router3.patch(
  "/:id",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: brandIdParamSchema, body: updateBrandSchema }),
  updateBrand2
);
router3.delete(
  "/:id",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: brandIdParamSchema }),
  deleteBrand2
);
var brand_routes_default = router3;

// src/modules/category/category.routes.ts
import { Router as Router4 } from "express";

// src/modules/category/category.validation.ts
import { z as z2, string as string4, object as object4, boolean as boolean3, coerce as coerce3 } from "zod";
var createCategorySchema = object4({
  name: string4().min(1, "Category name is required").max(100),
  slug: string4().min(1).max(120).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes").optional(),
  image: string4().url("Image must be a valid URL").optional(),
  parentId: string4().cuid("Invalid parent category ID").optional(),
  isActive: boolean3().default(true)
});
var updateCategorySchema = createCategorySchema.partial();
var categoryIdParamSchema = object4({
  id: string4().cuid("Invalid category ID")
});
var categoriesQuerySchema = object4({
  page: coerce3.number().int().positive().default(1),
  limit: coerce3.number().int().positive().max(100).default(50),
  search: string4().max(100).optional(),
  parentId: string4().optional(),
  // "null" to get root categories
  isActive: z2.string().optional().transform(
    (v) => v === "true" ? true : v === "false" ? false : void 0
  )
});

// src/modules/category/category.service.ts
import { StatusCodes as StatusCodes7 } from "http-status-codes";
var getAllCategories = async (query) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = {
    ...query.search && {
      name: { contains: query.search, mode: "insensitive" }
    },
    ...query.parentId === "null" ? { parentId: null } : query.parentId ? { parentId: query.parentId } : {},
    ...query.isActive !== void 0 && { isActive: query.isActive }
  };
  const [categories, total] = await Promise.all([
    db.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { children: true, products: true } }
      }
    }),
    db.category.count({ where })
  ]);
  return { categories, meta: buildPaginationMeta(total, page, limit) };
};
var getCategoryById = async (id) => {
  const category = await db.category.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true, slug: true } },
      children: {
        where: { isActive: true },
        select: { id: true, name: true, slug: true, image: true }
      },
      _count: { select: { products: true } }
    }
  });
  if (!category) throw new AppError("Category not found", StatusCodes7.NOT_FOUND);
  return category;
};
var createCategory = async (data) => {
  const slug = data.slug ?? slugify(data.name);
  const existing = await db.category.findFirst({
    where: { OR: [{ name: data.name }, { slug }] }
  });
  if (existing)
    throw new AppError("A category with this name or slug already exists", 409);
  if (data.parentId) {
    const parent = await db.category.findUnique({ where: { id: data.parentId } });
    if (!parent) throw new AppError("Parent category not found", 404);
  }
  return db.category.create({ data: { ...data, slug } });
};
var updateCategory = async (id, data) => {
  const category = await db.category.findUnique({ where: { id } });
  if (!category) throw new AppError("Category not found", 404);
  if (data.parentId === id)
    throw new AppError("Category cannot be its own parent", 400);
  const slug = data.name && !data.slug ? slugify(data.name) : data.slug;
  return db.category.update({
    where: { id },
    data: { ...data, ...slug && { slug } }
  });
};
var deleteCategory = async (id) => {
  const category = await db.category.findUnique({
    where: { id },
    include: {
      _count: { select: { children: true, products: true } }
    }
  });
  if (!category) throw new AppError("Category not found", 404);
  if (category._count.children > 0)
    throw new AppError("Cannot delete category \u2014 it has sub-categories", 400);
  if (category._count.products > 0)
    throw new AppError(
      `Cannot delete category \u2014 it has ${category._count.products} associated products`,
      400
    );
  return db.category.delete({ where: { id } });
};

// src/modules/category/category.controller.ts
import { StatusCodes as StatusCodes8 } from "http-status-codes";
var getAllCategories2 = catchAsync(async (req, res) => {
  const { categories, meta } = await getAllCategories(req.query);
  sendResponse({ res, statusCode: StatusCodes8.OK, success: true, message: "Categories fetched", data: categories, meta });
});
var getCategoryById2 = catchAsync(async (req, res) => {
  const category = await getCategoryById(String(req.params.id));
  sendResponse({ res, statusCode: StatusCodes8.OK, success: true, message: "Category fetched", data: category });
});
var createCategory2 = catchAsync(async (req, res) => {
  const category = await createCategory(req.body);
  sendResponse({ res, statusCode: StatusCodes8.CREATED, success: true, message: "Category created", data: category });
});
var updateCategory2 = catchAsync(async (req, res) => {
  const category = await updateCategory(String(req.params.id), req.body);
  sendResponse({ res, statusCode: StatusCodes8.OK, success: true, message: "Category updated", data: category });
});
var deleteCategory2 = catchAsync(async (req, res) => {
  await deleteCategory(String(req.params.id));
  sendResponse({ res, statusCode: StatusCodes8.OK, success: true, message: "Category deleted", data: null });
});

// src/modules/category/category.routes.ts
var router4 = Router4();
router4.get(
  "/",
  validate({ query: categoriesQuerySchema }),
  getAllCategories2
);
router4.get(
  "/:id",
  validate({ params: categoryIdParamSchema }),
  getCategoryById2
);
router4.post(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ body: createCategorySchema }),
  createCategory2
);
router4.patch(
  "/:id",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  updateCategory2
);
router4.delete(
  "/:id",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: categoryIdParamSchema }),
  deleteCategory2
);
var category_routes_default = router4;

// src/modules/product/product.routes.ts
import { Router as Router5 } from "express";
import { z as z4 } from "zod";

// src/modules/product/product.validation.ts
import { z as z3, string as string5, object as object5, boolean as boolean4, number, enum as zEnum3, array, coerce as coerce4 } from "zod";
var PRODUCT_TYPES = ["SINGLE", "VARIABLE"];
var PRICE_TYPES = ["COMMON", "ATTRIBUTE_BASED"];
var STOCK_TYPES = ["COMMON", "ATTRIBUTE_BASED"];
var STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];
var ATTRIBUTE_TYPES = ["COLOR", "SIZE"];
var DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"];
var productImageSchema = object5({
  photoURL: string5().url("Image URL must be valid"),
  isPrimary: boolean4().default(false),
  isThumbnail: boolean4().default(false),
  sortOrder: number().int().default(0),
  attributeId: string5().cuid().optional()
});
var productAttributeSchema = object5({
  attributeType: zEnum3(ATTRIBUTE_TYPES),
  title: string5().min(1).max(100),
  description: string5().max(50).optional(),
  // hex code or size label
  stock: number().int().min(0).optional(),
  regularPrice: number().positive().max(9999999999e-2, "Price cannot exceed 99,999,999.99").optional(),
  salesPrice: number().positive().max(9999999999e-2, "Price cannot exceed 99,999,999.99").optional(),
  images: array(productImageSchema).default([])
});
var productDiscountSchema = object5({
  discountType: zEnum3(DISCOUNT_TYPES),
  discountValue: number().positive("Discount value must be positive"),
  startsAt: coerce4.date().optional(),
  endsAt: coerce4.date().optional(),
  isActive: boolean4().default(true)
});
var baseProductObject = object5({
  title: string5().min(1, "Title is required").max(255),
  slug: string5().max(300).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes").optional(),
  productCode: string5().min(1).max(50).optional(),
  barcode: string5().max(50).optional(),
  productType: zEnum3(PRODUCT_TYPES).default("SINGLE"),
  priceType: zEnum3(PRICE_TYPES).default("COMMON"),
  stockType: zEnum3(STOCK_TYPES).default("COMMON"),
  status: zEnum3(STATUSES).default("DRAFT"),
  regularPrice: number().positive().max(9999999999e-2, "Price cannot exceed 99,999,999.99").optional(),
  salesPrice: number().positive().max(9999999999e-2, "Price cannot exceed 99,999,999.99").optional(),
  stock: number().int().min(0).optional(),
  shortDescription: string5().max(500).optional(),
  longDescription: string5().optional(),
  ingredients: string5().optional(),
  other: string5().optional(),
  brandId: string5().cuid("Invalid brand ID"),
  categoryId: string5().cuid("Invalid category ID"),
  attributes: array(productAttributeSchema).default([]),
  images: array(productImageSchema).default([]),
  discounts: array(productDiscountSchema).default([])
});
var createProductSchema = baseProductObject.refine(
  (data) => {
    if (data.regularPrice && data.salesPrice) {
      return data.salesPrice <= data.regularPrice;
    }
    return true;
  },
  { message: "Sales price cannot exceed regular price", path: ["salesPrice"] }
);
var updateProductSchema = baseProductObject.partial();
var productIdParamSchema = object5({
  id: string5().cuid("Invalid product ID")
});
var productsQuerySchema = object5({
  page: coerce4.number().int().positive().default(1),
  limit: coerce4.number().int().positive().max(100).default(20),
  search: string5().max(200).optional(),
  status: zEnum3(STATUSES).optional(),
  brandId: string5().cuid().optional(),
  categoryId: string5().cuid().optional(),
  productType: zEnum3(PRODUCT_TYPES).optional(),
  minPrice: coerce4.number().positive().optional(),
  maxPrice: coerce4.number().positive().optional(),
  sortBy: z3.enum(["createdAt", "title", "regularPrice", "salesPrice"]).default("createdAt"),
  sortOrder: zEnum3(["asc", "desc"]).default("desc")
});

// src/modules/product/product.service.ts
var getAllProducts = async (query, isAdmin4 = false) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = {
    // Public users can only see published products
    ...!isAdmin4 && { status: "PUBLISHED" },
    ...isAdmin4 && query.status && { status: query.status },
    ...query.search && {
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { productCode: { contains: query.search, mode: "insensitive" } }
      ]
    },
    ...query.brandId && { brandId: query.brandId },
    ...query.categoryId && { categoryId: query.categoryId },
    ...query.productType && { productType: query.productType },
    ...(query.minPrice !== void 0 || query.maxPrice !== void 0) && {
      regularPrice: {
        ...query.minPrice !== void 0 && { gte: query.minPrice },
        ...query.maxPrice !== void 0 && { lte: query.maxPrice }
      }
    }
  };
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: {
          where: { isPrimary: true },
          take: 1,
          orderBy: { sortOrder: "asc" }
        },
        discounts: { where: { isActive: true } },
        _count: { select: { reviews: true } }
      }
    }),
    db.product.count({ where })
  ]);
  return { products, meta: buildPaginationMeta(total, page, limit) };
};
var getProductById = async (id, isAdmin4 = false) => {
  const product = await db.product.findUnique({
    where: {
      id,
      ...!isAdmin4 && { status: "PUBLISHED" }
    },
    include: {
      brand: true,
      category: { include: { parent: true } },
      attributes: {
        orderBy: { createdAt: "asc" },
        include: { images: { orderBy: { sortOrder: "asc" } } }
      },
      images: { orderBy: { sortOrder: "asc" } },
      discounts: { where: { isActive: true } },
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, image: true } }
        }
      },
      _count: { select: { reviews: true } }
    }
  });
  if (!product) throw new AppError("Product not found", 404);
  return product;
};
var getProductBySlug = async (slug) => {
  const product = await db.product.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      brand: true,
      category: { include: { parent: true } },
      attributes: {
        orderBy: { createdAt: "asc" },
        include: { images: { orderBy: { sortOrder: "asc" } } }
      },
      images: { orderBy: { sortOrder: "asc" } },
      discounts: { where: { isActive: true } },
      _count: { select: { reviews: true } }
    }
  });
  if (!product) throw new AppError("Product not found", 404);
  return product;
};
var createProduct = async (data) => {
  const slug = data.slug ?? slugify(data.title);
  const productCode = data.productCode ?? generateProductCode();
  const existing = await db.product.findFirst({
    where: {
      OR: [{ slug }, { productCode }]
    }
  });
  if (existing)
    throw new AppError("A product with this slug or product code already exists", 409);
  const { attributes, images, discounts, ...productData } = data;
  return db.$transaction(
    async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          slug,
          productCode,
          regularPrice: productData.regularPrice ? productData.regularPrice : void 0,
          salesPrice: productData.salesPrice ? productData.salesPrice : void 0
        }
      });
      const attrImageRows = [];
      if (attributes.length > 0) {
        await Promise.all(
          attributes.map(async (attr) => {
            const { images: attrImages, ...attrData } = attr;
            const createdAttr = await tx.productAttribute.create({
              data: { ...attrData, productId: product.id }
            });
            for (const img of attrImages) {
              attrImageRows.push({
                ...img,
                productId: product.id,
                attributeId: createdAttr.id
              });
            }
          })
        );
      }
      const allImages = [
        ...attrImageRows,
        ...images.map((img) => ({
          ...img,
          productId: product.id,
          attributeId: img.attributeId ?? null
        }))
      ];
      await Promise.all([
        allImages.length > 0 ? tx.productImage.createMany({ data: allImages }) : Promise.resolve(),
        discounts.length > 0 ? tx.productDiscount.createMany({
          data: discounts.map((d) => ({ ...d, productId: product.id }))
        }) : Promise.resolve()
      ]);
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          brand: true,
          category: true,
          attributes: { include: { images: true } },
          images: true,
          discounts: true
        }
      });
    },
    { timeout: 3e4 }
  );
};
var updateProduct = async (id, data) => {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Product not found", 404);
  const slug = data.title && !data.slug ? slugify(data.title) : data.slug;
  const { attributes: _a, images: _i, discounts: _d, ...updateData } = data;
  return db.product.update({
    where: { id },
    data: {
      ...updateData,
      ...slug && { slug }
    },
    include: {
      brand: true,
      category: true,
      attributes: { include: { images: true } },
      images: true,
      discounts: true
    }
  });
};
var deleteProduct = async (id) => {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Product not found", 404);
  return db.product.delete({ where: { id } });
};
var updateProductStatus = async (id, status) => {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Product not found", 404);
  return db.product.update({ where: { id }, data: { status } });
};

// src/modules/product/product.controller.ts
var isAdmin = (req) => ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(req.currentUser?.role ?? "");
var getAllProducts2 = catchAsync(async (req, res) => {
  const { products, meta } = await getAllProducts(
    req.query,
    isAdmin(req)
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Products fetched", data: products, meta });
});
var getProductById2 = catchAsync(async (req, res) => {
  const product = await getProductById(String(req.params.id), isAdmin(req));
  sendResponse({ res, statusCode: 200, success: true, message: "Product fetched", data: product });
});
var getProductBySlug2 = catchAsync(async (req, res) => {
  const product = await getProductBySlug(String(req.params.slug));
  sendResponse({ res, statusCode: 200, success: true, message: "Product fetched", data: product });
});
var createProduct2 = catchAsync(async (req, res) => {
  const product = await createProduct(req.body);
  sendResponse({ res, statusCode: 201, success: true, message: "Product created", data: product });
});
var updateProduct2 = catchAsync(async (req, res) => {
  const product = await updateProduct(String(req.params.id), req.body);
  sendResponse({ res, statusCode: 200, success: true, message: "Product updated", data: product });
});
var deleteProduct2 = catchAsync(async (req, res) => {
  await deleteProduct(String(req.params.id));
  sendResponse({ res, statusCode: 200, success: true, message: "Product deleted", data: null });
});
var updateProductStatus2 = catchAsync(async (req, res) => {
  const product = await updateProductStatus(
    String(req.params.id),
    req.body.status
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Product status updated", data: product });
});

// src/modules/product/product.routes.ts
var router5 = Router5();
router5.get(
  "/",
  optionalAuth,
  validate({ query: productsQuerySchema }),
  getAllProducts2
);
router5.get(
  "/slug/:slug",
  validate({ params: z4.object({ slug: z4.string().min(1) }) }),
  getProductBySlug2
);
router5.get(
  "/:id",
  optionalAuth,
  validate({ params: productIdParamSchema }),
  getProductById2
);
router5.post(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ body: createProductSchema }),
  createProduct2
);
router5.patch(
  "/:id",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  updateProduct2
);
router5.patch(
  "/:id/status",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({
    params: productIdParamSchema,
    body: z4.object({
      status: z4.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
    })
  }),
  updateProductStatus2
);
router5.delete(
  "/:id",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: productIdParamSchema }),
  deleteProduct2
);
var product_routes_default = router5;

// src/modules/order/order.routes.ts
import { Router as Router6 } from "express";

// src/modules/order/order.validation.ts
import { z as z5, string as string6, object as object6, number as number2, enum as zEnum4, array as array2, coerce as coerce5 } from "zod";
var ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED"
];
var PAYMENT_STATUSES = [
  "UNPAID",
  "PAID",
  "REFUNDED",
  "PARTIALLY_REFUNDED"
];
var DELIVERY_TYPES = ["HOME_DELIVERY", "STORE_PICKUP"];
var orderItemSchema = object6({
  productId: string6().cuid("Invalid product ID"),
  title: string6().min(1).max(255),
  image: string6().url().optional(),
  color: string6().max(50).optional(),
  size: string6().max(50).optional(),
  quantity: number2().int().positive("Quantity must be at least 1"),
  unitPrice: number2().positive("Unit price must be positive"),
  discountAmount: number2().min(0).default(0)
});
var createOrderSchema = z5.object({
  // Authenticated user order
  addressId: string6().cuid().optional(),
  // Guest checkout fields
  guestName: string6().min(2).max(100).optional(),
  guestEmail: string6().email().optional(),
  guestPhone: string6().regex(/^\d{7,15}$/).optional(),
  guestAddress: string6().min(5).max(255).optional(),
  guestCity: string6().min(2).max(100).optional(),
  deliveryType: zEnum4(DELIVERY_TYPES).default("HOME_DELIVERY"),
  paymentMethod: string6().min(1, "Payment method is required").max(50),
  paymentGateway: string6().max(50).optional(),
  discount: number2().min(0).default(0),
  deliveryCharge: number2().min(0).default(0),
  notes: string6().max(500).optional(),
  items: array2(orderItemSchema).min(1, "Order must have at least one item")
}).superRefine((data, ctx) => {
  if (data.deliveryType === "HOME_DELIVERY" && !data.addressId) {
    if (!data.guestAddress || !data.guestCity) {
      ctx.addIssue({
        code: "custom",
        message: "Delivery address and city are required for home delivery",
        path: ["guestAddress"]
      });
    }
  }
});
var updateOrderStatusSchema = object6({
  status: zEnum4(ORDER_STATUSES)
});
var updatePaymentStatusSchema = object6({
  paymentStatus: zEnum4(PAYMENT_STATUSES)
});
var orderIdParamSchema = object6({
  id: string6().cuid("Invalid order ID")
});
var ordersQuerySchema = object6({
  page: coerce5.number().int().positive().default(1),
  limit: coerce5.number().int().positive().max(100).default(20),
  status: zEnum4(ORDER_STATUSES).optional(),
  paymentStatus: zEnum4(PAYMENT_STATUSES).optional(),
  userId: string6().cuid().optional(),
  search: string6().max(100).optional(),
  // order number search
  sortOrder: zEnum4(["asc", "desc"]).default("desc")
});

// src/modules/order/order.service.ts
var createOrder = async (data, userId) => {
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice - (item.discountAmount ?? 0),
    0
  );
  const total = subtotal + data.deliveryCharge - data.discount;
  const order = await db.$transaction(async (tx) => {
    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId, status: "PUBLISHED" }
      });
      if (!product) {
        throw new AppError(`Product not found: ${item.title}`, 404);
      }
      if (product.stockType === "COMMON" && product.stock !== null && product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for: ${product.title}`, 400);
      }
    }
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: userId ?? null,
        addressId: data.addressId ?? null,
        status: "PENDING",
        paymentStatus: "UNPAID",
        paymentMethod: data.paymentMethod,
        paymentGateway: data.paymentGateway ?? null,
        deliveryType: data.deliveryType,
        subtotal,
        discount: data.discount,
        deliveryCharge: data.deliveryCharge,
        total,
        notes: data.notes ?? null,
        guestName: data.guestName ?? null,
        guestEmail: data.guestEmail ?? null,
        guestPhone: data.guestPhone ?? null,
        guestAddress: data.guestAddress ?? null,
        guestCity: data.guestCity ?? null
      }
    });
    for (const item of data.items) {
      const itemTotal = item.quantity * item.unitPrice - (item.discountAmount ?? 0);
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: item.productId,
          title: item.title,
          image: item.image ?? null,
          color: item.color ?? null,
          size: item.size ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount ?? 0,
          total: itemTotal
        }
      });
      await tx.product.updateMany({
        where: { id: item.productId, stockType: "COMMON" },
        data: { stock: { decrement: item.quantity } }
      });
    }
    return newOrder;
  });
  const recipientEmail = userId ? (await db.user.findUnique({ where: { id: userId } }))?.email : data.guestEmail;
  const recipientName = (userId ? (await db.user.findUnique({ where: { id: userId } }))?.name : data.guestName) ?? "Customer";
  if (recipientEmail) {
    resend.emails.send({
      from: env.RESEND_EMAIL_FROM,
      to: recipientEmail,
      subject: `Order Confirmed \u2014 ${order.orderNumber}`,
      html: orderConfirmationEmailHtml(
        recipientName,
        order.orderNumber,
        total.toFixed(2)
      )
    }).catch(console.error);
  }
  return db.order.findUnique({
    where: { id: order.id },
    include: { items: true, address: true }
  });
};
var getMyOrders = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = {
    userId,
    ...query.status && { status: query.status },
    ...query.paymentStatus && { paymentStatus: query.paymentStatus }
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: query.sortOrder },
      include: {
        items: {
          include: { product: { select: { id: true, slug: true } } }
        },
        address: true
      }
    }),
    db.order.count({ where })
  ]);
  return { orders, meta: buildPaginationMeta(total, page, limit) };
};
var getOrderById = async (id, userId, isAdmin4 = false) => {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { id: true, title: true, slug: true } }
        }
      },
      address: true,
      user: { select: { id: true, name: true, email: true } }
    }
  });
  if (!order) throw new AppError("Order not found", 404);
  if (!isAdmin4 && order.userId !== userId) {
    throw new AppError("Forbidden", 403);
  }
  return order;
};
var getAllOrders = async (query) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = {
    ...query.status && { status: query.status },
    ...query.paymentStatus && { paymentStatus: query.paymentStatus },
    ...query.userId && { userId: query.userId },
    ...query.search && {
      orderNumber: { contains: query.search, mode: "insensitive" }
    }
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: query.sortOrder },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } }
      }
    }),
    db.order.count({ where })
  ]);
  return { orders, meta: buildPaginationMeta(total, page, limit) };
};
var updateOrderStatus = async (id, data) => {
  const order = await db.order.findUnique({ where: { id } });
  if (!order) throw new AppError("Order not found", 404);
  return db.order.update({
    where: { id },
    data: { status: data.status }
  });
};
var updatePaymentStatus = async (id, data) => {
  const order = await db.order.findUnique({ where: { id } });
  if (!order) throw new AppError("Order not found", 404);
  return db.order.update({
    where: { id },
    data: { paymentStatus: data.paymentStatus }
  });
};

// src/modules/order/order.controller.ts
var isAdmin2 = (req) => ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(req.currentUser?.role ?? "");
var createOrder2 = catchAsync(async (req, res) => {
  const order = await createOrder(req.body, req.currentUser?.id);
  sendResponse({ res, statusCode: 201, success: true, message: "Order placed successfully", data: order });
});
var getMyOrders2 = catchAsync(async (req, res) => {
  const { orders, meta } = await getMyOrders(
    req.currentUser.id,
    req.query
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Orders fetched", data: orders, meta });
});
var getOrderById2 = catchAsync(async (req, res) => {
  const order = await getOrderById(
    String(req.params.id),
    req.currentUser?.id,
    isAdmin2(req)
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Order fetched", data: order });
});
var getAllOrders2 = catchAsync(async (req, res) => {
  const { orders, meta } = await getAllOrders(req.query);
  sendResponse({ res, statusCode: 200, success: true, message: "All orders fetched", data: orders, meta });
});
var updateOrderStatus2 = catchAsync(async (req, res) => {
  const order = await updateOrderStatus(String(req.params.id), req.body);
  sendResponse({ res, statusCode: 200, success: true, message: "Order status updated", data: order });
});
var updatePaymentStatus2 = catchAsync(async (req, res) => {
  const order = await updatePaymentStatus(String(req.params.id), req.body);
  sendResponse({ res, statusCode: 200, success: true, message: "Payment status updated", data: order });
});

// src/modules/order/order.routes.ts
var router6 = Router6();
router6.post(
  "/",
  optionalAuth,
  writeLimiter,
  validate({ body: createOrderSchema }),
  createOrder2
);
router6.get(
  "/my-orders",
  requireAuth,
  validate({ query: ordersQuerySchema }),
  getMyOrders2
);
router6.get(
  "/:id",
  requireAuth,
  validate({ params: orderIdParamSchema }),
  getOrderById2
);
router6.get(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ query: ordersQuerySchema }),
  getAllOrders2
);
router6.patch(
  "/:id/status",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  updateOrderStatus2
);
router6.patch(
  "/:id/payment-status",
  requireAuth,
  requireMinRole("ADMIN"),
  validate({ params: orderIdParamSchema, body: updatePaymentStatusSchema }),
  updatePaymentStatus2
);
var order_routes_default = router6;

// src/modules/review/review.routes.ts
import { Router as Router7 } from "express";

// src/modules/review/review.validation.ts
import { string as string7, object as object7, number as number3, enum as zEnum5, coerce as coerce6 } from "zod";
var createReviewSchema = object7({
  productId: string7().cuid("Invalid product ID"),
  rating: number3().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  comment: string7().min(5, "Comment must be at least 5 characters").max(1e3).optional()
});
var updateReviewSchema = object7({
  rating: number3().int().min(1).max(5).optional(),
  comment: string7().min(5).max(1e3).optional()
});
var reviewIdParamSchema = object7({
  id: string7().cuid("Invalid review ID")
});
var reviewsQuerySchema = object7({
  page: coerce6.number().int().positive().default(1),
  limit: coerce6.number().int().positive().max(100).default(20),
  productId: string7().cuid().optional(),
  userId: string7().cuid().optional(),
  rating: coerce6.number().int().min(1).max(5).optional(),
  isVerified: string7().optional().transform(
    (v) => v === "true" ? true : v === "false" ? false : void 0
  ),
  sortOrder: zEnum5(["asc", "desc"]).default("desc")
});

// src/modules/review/review.service.ts
var getReviews = async (query) => {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where = {
    ...query.productId && { productId: query.productId },
    ...query.userId && { userId: query.userId },
    ...query.rating && { rating: query.rating },
    ...query.isVerified !== void 0 && { isVerified: query.isVerified }
  };
  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: query.sortOrder },
      include: {
        user: { select: { id: true, name: true, image: true } },
        product: { select: { id: true, title: true, slug: true } }
      }
    }),
    db.review.count({ where })
  ]);
  return { reviews, meta: buildPaginationMeta(total, page, limit) };
};
var createReview = async (userId, data) => {
  const product = await db.product.findUnique({
    where: { id: data.productId, status: "PUBLISHED" }
  });
  if (!product) throw new AppError("Product not found", 404);
  const existing = await db.review.findUnique({
    where: { productId_userId: { productId: data.productId, userId } }
  });
  if (existing)
    throw new AppError("You have already reviewed this product", 409);
  const hasOrderedProduct = await db.orderItem.findFirst({
    where: {
      productId: data.productId,
      order: { userId, status: "DELIVERED" }
    }
  });
  return db.review.create({
    data: {
      ...data,
      userId,
      isVerified: !!hasOrderedProduct
    },
    include: {
      user: { select: { id: true, name: true, image: true } }
    }
  });
};
var updateReview = async (id, userId, data) => {
  const review = await db.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Review not found", 404);
  if (review.userId !== userId) throw new AppError("Forbidden", 403);
  return db.review.update({ where: { id }, data });
};
var deleteReview = async (id, userId, isAdmin4) => {
  const review = await db.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Review not found", 404);
  if (!isAdmin4 && review.userId !== userId)
    throw new AppError("Forbidden", 403);
  return db.review.delete({ where: { id } });
};
var toggleVerifyReview = async (id) => {
  const review = await db.review.findUnique({ where: { id } });
  if (!review) throw new AppError("Review not found", 404);
  return db.review.update({
    where: { id },
    data: { isVerified: !review.isVerified }
  });
};

// src/modules/review/review.controller.ts
var isAdmin3 = (req) => ["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(req.currentUser?.role ?? "");
var getReviews2 = catchAsync(async (req, res) => {
  const { reviews, meta } = await getReviews(req.query);
  sendResponse({ res, statusCode: 200, success: true, message: "Reviews fetched", data: reviews, meta });
});
var createReview2 = catchAsync(async (req, res) => {
  const review = await createReview(req.currentUser.id, req.body);
  sendResponse({ res, statusCode: 201, success: true, message: "Review submitted", data: review });
});
var updateReview2 = catchAsync(async (req, res) => {
  const review = await updateReview(
    String(req.params.id),
    req.currentUser.id,
    req.body
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Review updated", data: review });
});
var deleteReview2 = catchAsync(async (req, res) => {
  await deleteReview(String(req.params.id), req.currentUser.id, isAdmin3(req));
  sendResponse({ res, statusCode: 200, success: true, message: "Review deleted", data: null });
});
var toggleVerifyReview2 = catchAsync(async (req, res) => {
  const review = await toggleVerifyReview(String(req.params.id));
  sendResponse({
    res,
    statusCode: 200,
    success: true,
    message: `Review ${review.isVerified ? "verified" : "unverified"}`,
    data: review
  });
});

// src/modules/review/review.routes.ts
var router7 = Router7();
router7.get(
  "/",
  validate({ query: reviewsQuerySchema }),
  getReviews2
);
router7.post(
  "/",
  requireAuth,
  validate({ body: createReviewSchema }),
  createReview2
);
router7.patch(
  "/:id",
  requireAuth,
  validate({ params: reviewIdParamSchema, body: updateReviewSchema }),
  updateReview2
);
router7.delete(
  "/:id",
  requireAuth,
  validate({ params: reviewIdParamSchema }),
  deleteReview2
);
router7.patch(
  "/:id/verify",
  requireAuth,
  requireMinRole("MODERATOR"),
  validate({ params: reviewIdParamSchema }),
  toggleVerifyReview2
);
var review_routes_default = router7;

// src/modules/wishlist/wishlist.routes.ts
import { Router as Router8 } from "express";

// src/modules/wishlist/wishlist.validation.ts
import { string as string8, object as object8 } from "zod";
var wishlistItemParamSchema = object8({
  productId: string8().cuid("Invalid product ID")
});

// src/modules/wishlist/wishlist.service.ts
var getMyWishlist = async (userId) => {
  return db.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          regularPrice: true,
          salesPrice: true,
          status: true,
          images: {
            where: { isPrimary: true },
            take: 1
          }
        }
      }
    }
  });
};
var addToWishlist = async (userId, productId) => {
  const product = await db.product.findUnique({
    where: { id: productId, status: "PUBLISHED" }
  });
  if (!product) throw new AppError("Product not found", 404);
  return db.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
    // already exists — no-op
    include: { product: { select: { id: true, title: true } } }
  });
};
var removeFromWishlist = async (userId, productId) => {
  const item = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } }
  });
  if (!item) throw new AppError("Item not in wishlist", 404);
  return db.wishlistItem.delete({
    where: { userId_productId: { userId, productId } }
  });
};
var clearWishlist = async (userId) => {
  return db.wishlistItem.deleteMany({ where: { userId } });
};

// src/modules/wishlist/wishlist.controller.ts
var getMyWishlist2 = catchAsync(async (req, res) => {
  const items = await getMyWishlist(req.currentUser.id);
  sendResponse({ res, statusCode: 200, success: true, message: "Wishlist fetched", data: items });
});
var addToWishlist2 = catchAsync(async (req, res) => {
  const item = await addToWishlist(
    req.currentUser.id,
    String(req.params.productId)
  );
  sendResponse({ res, statusCode: 201, success: true, message: "Added to wishlist", data: item });
});
var removeFromWishlist2 = catchAsync(async (req, res) => {
  await removeFromWishlist(
    req.currentUser.id,
    String(req.params.productId)
  );
  sendResponse({ res, statusCode: 200, success: true, message: "Removed from wishlist", data: null });
});
var clearWishlist2 = catchAsync(async (req, res) => {
  await clearWishlist(req.currentUser.id);
  sendResponse({ res, statusCode: 200, success: true, message: "Wishlist cleared", data: null });
});

// src/modules/wishlist/wishlist.routes.ts
var router8 = Router8();
router8.use(requireAuth);
router8.get("/", getMyWishlist2);
router8.delete("/clear", clearWishlist2);
router8.post(
  "/:productId",
  validate({ params: wishlistItemParamSchema }),
  addToWishlist2
);
router8.delete(
  "/:productId",
  validate({ params: wishlistItemParamSchema }),
  removeFromWishlist2
);
var wishlist_routes_default = router8;

// src/modules/upload/upload.routes.ts
import { Router as Router9 } from "express";

// src/modules/upload/upload.controller.ts
import multer from "multer";
import streamifier from "streamifier";

// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});
var cloudinary_default = cloudinary;

// src/modules/upload/upload.controller.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  }
});
var uploadImage = catchAsync(
  async (req, res, _next) => {
    if (!req.file) throw new AppError("No image file provided", 400);
    const result = await new Promise(
      (resolve, reject) => {
        const stream = cloudinary_default.uploader.upload_stream(
          { folder: "shine-bright/products", resource_type: "image" },
          (error, result2) => {
            if (error || !result2) reject(error ?? new Error("Upload failed"));
            else resolve(result2);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      }
    );
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Image uploaded successfully",
      data: { url: result.secure_url, publicId: result.public_id }
    });
  }
);
var deleteImages = catchAsync(
  async (req, res, _next) => {
    const { publicIds } = req.body;
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      throw new AppError("publicIds array is required", 400);
    }
    await Promise.all(
      publicIds.map(
        (id) => cloudinary_default.uploader.destroy(id, { resource_type: "image" })
      )
    );
    sendResponse({
      res,
      statusCode: 200,
      success: true,
      message: "Images deleted (rollback done)"
    });
  }
);

// src/modules/upload/upload.routes.ts
var router9 = Router9();
router9.post(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  upload.single("image"),
  uploadImage
);
router9.delete(
  "/",
  requireAuth,
  requireMinRole("MODERATOR"),
  deleteImages
);
var upload_routes_default = router9;

// src/routes/index.ts
var router10 = Router10();
router10.use("/upload", upload_routes_default);
router10.use("/users", user_routes_default);
router10.use("/addresses", address_routes_default);
router10.use("/brands", brand_routes_default);
router10.use("/categories", category_routes_default);
router10.use("/products", product_routes_default);
router10.use("/orders", order_routes_default);
router10.use("/reviews", review_routes_default);
router10.use("/wishlist", wishlist_routes_default);
var routes_default = router10;

// src/app.ts
var app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
  })
);
app.all("/api/auth/*", toNodeHandler(auth));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Shine Bright API is running",
    env: env.NODE_ENV,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api", apiRateLimiter);
app.use("/api", routes_default);
app.use(notFoundHandler);
app.use(globalErrorHandler);
var app_default = app;
export {
  app_default as default
};
