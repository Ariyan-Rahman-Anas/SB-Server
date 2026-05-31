/**
 * Seed script: creates a SUPER_ADMIN user using better-auth's API.
 * Run: npx ts-node --project tsconfig.json src/scripts/seed-admin.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { db } from "../lib/prisma";
import { auth } from "../auth/auth";

const SUPER_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@shinebright.com";
const SUPER_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
const SUPER_ADMIN_NAME = "Super Admin";

async function seedSuperAdmin() {
  console.log("🌱 Seeding SUPER_ADMIN...");

  // Check if already exists
  const existing = await db.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });

  if (existing) {
    // If exists but role is not SUPER_ADMIN, update role
    if (existing.role !== "SUPER_ADMIN") {
      await db.user.update({
        where: { id: existing.id },
        data: { role: "SUPER_ADMIN", emailVerified: true, isActive: true },
      });
      console.log(`✅ Updated existing user to SUPER_ADMIN: ${SUPER_ADMIN_EMAIL}`);
    } else {
      console.log(`ℹ️  SUPER_ADMIN already exists: ${SUPER_ADMIN_EMAIL}`);
    }
    return;
  }

  // Create via better-auth API (handles password hashing)
  const response = await auth.api.signUpEmail({
    body: {
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      name: SUPER_ADMIN_NAME,
    },
  });

  if (!response?.user) {
    throw new Error("Failed to create admin user via better-auth");
  }

  // Update role and mark email as verified
  await db.user.update({
    where: { id: response.user.id },
    data: {
      role: "SUPER_ADMIN",
      emailVerified: true,
      isActive: true,
      firstName: "Super",
      lastName: "Admin",
    },
  });

  console.log(`✅ SUPER_ADMIN created successfully!`);
  console.log(`   Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(`   Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log(`   ⚠️  Change the password after first login!`);
}

seedSuperAdmin()
  .catch((err) => {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
