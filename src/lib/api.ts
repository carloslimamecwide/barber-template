import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiError(code: string, message: string, status: number, fields?: ZodError["issues"]) {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  );
}
