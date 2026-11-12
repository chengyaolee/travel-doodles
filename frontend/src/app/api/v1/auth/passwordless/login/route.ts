import { NextRequest } from "next/server";
import { POST as loginHandler } from "../login/route";

export async function POST(req: NextRequest) {
  return loginHandler(req);
}
