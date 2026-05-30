import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "../lib/prisma";
import { env } from "../config/env";
import { resend } from "../lib/resend";
import { passwordResetEmailHtml, verificationEmailHtml } from "./email-templates";

export const auth = betterAuth({
  // ── Core ────────────────────────────────────────────────────────────────────
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.ALLOWED_ORIGINS,

  // ── Database ─────────────────────────────────────────────────────────────────
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  // ── Email & Password ─────────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,

    sendResetPassword: async ({ user, url, token }) => {
      // Point user to the frontend reset page with the token
      const frontendResetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
      await resend.emails.send({
        from: env.RESEND_EMAIL_FROM,
        to: user.email,
        subject: "Reset your password — Shine Bright",
        html: passwordResetEmailHtml(user.name, frontendResetUrl),
      });
    },
  },

  // ── Email Verification ───────────────────────────────────────────────────────
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: env.RESEND_EMAIL_FROM,
        to: user.email,
        subject: "Verify your email — Shine Bright",
        html: verificationEmailHtml(user.name, url),
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24 hours
  },

  // ── Social Providers ─────────────────────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  // ── User Additional Fields ───────────────────────────────────────────────────
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CUSTOMER",
        input: false, // not user-settable via API
      },
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      countryCode: {
        type: "string",
        defaultValue: "+880",
        required: false,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
    },
  },

  // ── Session ──────────────────────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7,       // 7 days
    updateAge: 60 * 60 * 24,            // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,                   // cache cookie for 5 min
    },
  },

  // ── Built-in Rate Limiting (for auth routes only) ────────────────────────────
  rateLimit: {
    enabled: true,
    window: 60,   // seconds
    max: 20,
    customRules: {
      "/sign-in/email": {
        window: 60 * 15, // 15 min
        max: 5,
      },
      "/forget-password": {
        window: 60 * 15,
        max: 3,
      },
      "/sign-up/email": {
        window: 60 * 60,
        max: 10,
      },
    },
  },

  // ── Hooks ────────────────────────────────────────────────────────────────────
  // Welcome email: best sent from the user registration endpoint directly
  // or via a database trigger — not via better-auth hooks (ctx shape varies).
});

export type Auth = typeof auth;

