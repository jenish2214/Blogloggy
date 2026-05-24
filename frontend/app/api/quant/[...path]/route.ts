import { NextRequest, NextResponse } from "next/server";

function resolveQuantBase(): { base: string } | { error: string; hint: string } {
  const configured = process.env.QUANT_SERVICE_URL?.trim().replace(/\/$/, "");
  const isVercel = !!process.env.VERCEL;

  if (configured) return { base: configured };

  if (isVercel) {
    return {
      error: "quant_service_not_configured",
      hint: "Set QUANT_SERVICE_URL on Vercel (e.g. https://quantdesk-quant.onrender.com) and deploy quant-service on Render.",
    };
  }

  return { base: "http://localhost:8000" };
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const resolved = resolveQuantBase();
  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error, hint: resolved.hint },
      { status: 503 }
    );
  }

  const path = "/" + pathSegments.join("/");
  const url = `${resolved.base}${path}${req.nextUrl.search}`;

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
    if (res.status === 404 && text.trim() === "Not Found") {
      return NextResponse.json(
        {
          error: "quant_service_not_deployed",
          hint:
            "Deploy quant-service on Render: https://dashboard.render.com/blueprint/new?repo=https://github.com/jenish2214/Blogloggy — then verify GET /health on QUANT_SERVICE_URL.",
        },
        { status: 503 }
      );
    }
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    const detail = (err as Error).message;
    const hint =
      detail.includes("ECONNREFUSED") || detail.includes("fetch failed")
        ? "Start quant-service locally: cd quant-service && pip install -r requirements.txt && uvicorn main:app --port 8000 — or set QUANT_SERVICE_URL to a deployed engine."
        : "Check QUANT_SERVICE_URL and that the quant engine is running.";
    return NextResponse.json(
      { error: "quant_service_unavailable", detail, hint },
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
