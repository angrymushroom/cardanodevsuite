import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FEEDBACK_FILE = path.join(process.cwd(), "feedback.json");

interface FeedbackEntry {
  id: string;
  type: "feature" | "bug" | "general";
  message: string;
  email?: string;
  createdAt: string;
}

function loadFeedback(): FeedbackEntry[] {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) return [];
    return JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, message, email } = body;

    if (!type || !message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const validTypes = ["feature", "bug", "general"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const entry: FeedbackEntry = {
      id: crypto.randomUUID(),
      type,
      message: message.trim().slice(0, 2000),
      email: typeof email === "string" && email.trim() ? email.trim().slice(0, 200) : undefined,
      createdAt: new Date().toISOString(),
    };

    const all = loadFeedback();
    all.push(entry);
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(all, null, 2), "utf-8");

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
