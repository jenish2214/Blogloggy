import { NextRequest, NextResponse } from "next/server";
import {
  fetchIndiaCompany,
  screenerCompanyUrl,
  slimFinancialTable,
  toScreenerSymbol,
} from "@/lib/market/screenerIndia";
import { fromCache, toCache } from "@/lib/market-fetch";
import type { IndiaCompanyDetail } from "@/types/india-market";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function GET(
  _req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol_required" }, { status: 400 });
  }

  const screenerSym = toScreenerSymbol(symbol);
  const cacheKey = `market:india:company:${screenerSym}`;
  const cached = fromCache<IndiaCompanyDetail>(cacheKey);
  if (cached) {
    return NextResponse.json({ company: cached, cached: true });
  }

  try {
    const data = await fetchIndiaCompany(symbol);

    const company: IndiaCompanyDetail = {
      symbol: data.symbol,
      name: data.name,
      mode: data.mode,
      topRatios: (data.topRatios ?? []).map((r) => ({
        name: r.name,
        value: r.value.replace(/\s+/g, " ").trim(),
      })),
      analysis: data.analysis,
      quarters: slimFinancialTable(data.quarters),
      profitLoss: slimFinancialTable(data.profitLoss),
      balanceSheet: slimFinancialTable(data.balanceSheet),
      cashFlow: slimFinancialTable(data.cashFlow),
      ratios: slimFinancialTable(data.ratios),
      shareholding: slimFinancialTable(data.shareholding),
      peers: data.peers?.slice(0, 12),
      documents: data.documents?.slice(0, 8),
      screenerUrl: screenerCompanyUrl(symbol),
      fetchedAt: new Date().toISOString(),
      warnings: [],
    };

    toCache(cacheKey, company, 300_000);

    return NextResponse.json({ company, cached: false });
  } catch (err) {
    return NextResponse.json(
      {
        error: "india_company_failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
