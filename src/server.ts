import { env } from "./config/env";
import app from "./app";
import { db } from "./lib/prisma";

const startServer = async () => {
  try {
    // Verify database connection
    await db.$connect();
    console.log("✅ Database connected");

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
      console.log(`🔐 Auth routes: http://localhost:${env.PORT}/api/auth`);
      console.log(`📦 API routes:  http://localhost:${env.PORT}/api`);
      console.log(`🌿 Environment: ${env.NODE_ENV}`);
    });

    // ── Graceful shutdown ───────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      console.log(`\n⚠️  ${signal} received — shutting down gracefully`);
      server.close(async () => {
        await db.$disconnect();
        console.log("✅ Database disconnected");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      console.error("🔴 Unhandled Promise Rejection:", reason);
      shutdown("UNHANDLED_REJECTION");
    });
  } catch (error) {
    console.error("🔴 Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
