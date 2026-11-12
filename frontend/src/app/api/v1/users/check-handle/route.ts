import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const handle = searchParams.get("handle") || "";
  const authUser = userStore.getAuthUser(req);

  const result = userStore.checkHandleAvailability(handle, authUser?.id);
  return NextResponse.json(result);
}
