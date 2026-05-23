import YahooFinance from "yahoo-finance2";

/** Shared Yahoo Finance client (handles cookies/crumbs for options + quotes) */
export const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});
