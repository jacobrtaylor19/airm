import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { reportError } from "@/lib/monitoring";

// Get a specific conversation with full messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [conv] = await db
      .select()
      .from(schema.chatConversations)
      .where(and(
        eq(schema.chatConversations.id, parseInt(params.id, 10)),
        eq(schema.chatConversations.userId, user.id),
      ));

    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      conversation: {
        ...conv,
        messages: JSON.parse(conv.messages),
      },
    });
  } catch (err) {
    reportError(err, { route: "GET /api/assistant/conversations/[id]" });
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

// Update conversation (add messages)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { messages, title } = body;
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = { updatedAt: now };
    if (messages) {
      updates.messages = JSON.stringify(messages);
      updates.messageCount = messages.length;
      updates.lastMessageAt = now;
    }
    if (title) updates.title = title;

    await db
      .update(schema.chatConversations)
      .set(updates)
      .where(and(
        eq(schema.chatConversations.id, parseInt(params.id, 10)),
        eq(schema.chatConversations.userId, user.id),
      ));

    return NextResponse.json({ success: true });
  } catch (err) {
    reportError(err, { route: "PATCH /api/assistant/conversations/[id]" });
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}
