import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready", database: "ok" });
  } catch (error) {
    logger.error("readiness.failed", error);
    return NextResponse.json({ status: "not_ready", database: "error" }, { status: 503 });
  }
}
