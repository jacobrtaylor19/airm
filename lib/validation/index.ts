import { ZodSchema, ZodError } from "zod";
import { NextResponse } from "next/server";

function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.issues.map((e) => ({
    field: e.path.join(".") || "body",
    message: e.message,
  }));
}

export function validateBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(result.error) },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
