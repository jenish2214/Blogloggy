import { NextRequest, NextResponse } from "next/server";

const QUANT_BASE =
  process.env.QUANT_SERVICE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

async function proxy(req: NextRequest, pathSegments: string[]) {
  const path = "/" + pathSegments.join("/");
  const url = `${QUANT_BASE}${path}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "quant_service_unavailable",
        detail: (err as Error).message,
        hint: "Start quant-service: cd quant-service && pip install -r requirements.txt && uvicorn main:app --port 8000",
      },
      { status: 503 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params.path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params.path);
}
