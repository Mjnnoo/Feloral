import { NextRequest } from "next/server";
import { proxyAdminCmsRequest } from "@/lib/admin-cms-proxy";

export async function GET(request: NextRequest) {
  return proxyAdminCmsRequest(request, "/cms/admin/contents");
}

export async function POST(request: NextRequest) {
  return proxyAdminCmsRequest(request, "/cms/admin/contents");
}
