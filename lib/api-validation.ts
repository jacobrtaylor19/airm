import { z, ZodError } from "zod";
import { NextResponse } from "next/server";

/**
 * Shared API validation utilities for parsing request bodies and query params
 * with Zod schemas. Returns either parsed data or a structured 400 error response.
 */

function formatErrorResponse(error: ZodError) {
  return NextResponse.json(
    { error: "Validation failed", details: error.issues },
    { status: 400 }
  );
}

/**
 * Parse and validate a JSON request body against a Zod schema.
 *
 * @example
 * const result = await parseBody(request, mySchema);
 * if ("error" in result) return result.error;
 * const { data } = result;
 */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Validation failed", details: [{ code: "invalid_json", message: "Request body is not valid JSON", path: [] }] },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: formatErrorResponse(result.error) };
  }
  return { data: result.data };
}

/**
 * Parse and validate URL search params against a Zod schema.
 * Extracts all params as a flat key-value object before parsing.
 *
 * @example
 * const result = parseSearchParams(request.url, myQuerySchema);
 * if ("error" in result) return result.error;
 * const { data } = result;
 */
export function parseSearchParams<T>(
  url: string,
  schema: z.ZodType<T>
): { data: T } | { error: NextResponse } {
  const searchParams = new URL(url).searchParams;
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);
  if (!result.success) {
    return { error: formatErrorResponse(result.error) };
  }
  return { data: result.data };
}
