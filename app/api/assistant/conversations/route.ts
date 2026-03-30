import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { reportError } from "@/lib/monitoring";

// List user's conversations
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const conversations = await db
      .select({
        id: schema.chatConversations.id,
        title: schema.chatConversations.title,
        messageCount: schema.chatConversations.messageCount,
        lastMessageAt: schema.chatConversations.lastMessageAt,
        createdAt: schema.chatConversations.createdAt,
      })
      .from(schema.chatConversations)
      .where(eq(schema.chatConversations.userId, user.id))
      .orderBy(desc(schema.chatConversations.updatedAt))
      .limit(50);

    return NextResponse.json({ conversations });
  } catch (err) {
    reportError(err, { route: "GET /api/assistant/conversations" });
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

// Create new conversation
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { title, messages } = body;
    const now = new Date().toISOString();

    const [conv] = await db
      .insert(schema.chatConversations)
      .values({
        userId: user.id,
        title: title || "New conversation",
        messages: JSON.stringify(messages || []),
        messageCount: messages?.length || 0,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({ conversation: conv });
  } catch (err) {
    reportError(err, { route: "POST /api/assistant/conversations" });
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

// Delete a conversation
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db
      .delete(schema.chatConversations)
      .where(and(
        eq(schema.chatConversations.id, id),
        eq(schema.chatConversations.userId, user.id),
      ));

    return NextResponse.json({ success: true });
  } catch (err) {
    reportError(err, { route: "DELETE /api/assistant/conversations" });
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
