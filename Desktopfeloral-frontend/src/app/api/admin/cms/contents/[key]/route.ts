import { NextRequest } from "next/server";
import { proxyAdminCmsRequest } from "@/lib/admin-cms-proxy";

type RouteContext = {
  params: Promise<{ key: string }>;
};

async function proxyByKey(request: NextRequest, context: RouteContext) {
  const { key } = await context.params;
  return proxyAdminCmsRequest(
    request,
    `/cms/admin/contents/${encodeURIComponent(key)}`,
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyByKey(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyByKey(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyByKey(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyByKey(request, context);
}
