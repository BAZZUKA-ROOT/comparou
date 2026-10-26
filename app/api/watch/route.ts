import { NextRequest, NextResponse } from "next/server";
import { listWatch, addWatch, removeWatch } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listWatch());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { query, region, targetPrice } = body || {};
  if (!query) return NextResponse.json({ error: "missing query" }, { status: 400 });
  const item = await addWatch(query, region === "EX" ? "EX" : "BR", targetPrice);
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await removeWatch(id);
  return NextResponse.json({ ok: true });
}
