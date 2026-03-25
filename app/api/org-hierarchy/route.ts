import { NextResponse } from "next/server";
import { getOrgTree } from "@/lib/org-hierarchy";

export async function GET() {
  try {
    const tree = getOrgTree();
    return NextResponse.json({ tree });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load org hierarchy" },
      { status: 500 }
    );
  }
}
