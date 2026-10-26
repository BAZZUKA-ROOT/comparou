import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/lib/sources";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const region = (req.nextUrl.searchParams.get("region") === "EX" ? "EX" : "BR") as "BR" | "EX";
  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });
  const result = await searchAll(q, region);
  return NextResponse.json(result);
}
