/** Legal copy for welcome onboarding — education / demo platform. */

export const TERMS_SECTIONS = [
  {
    title: "1. Paper trading only",
    body: "QuantDesk uses simulated accounts and virtual capital. No real money is deposited, traded, or at risk. Performance on this platform does not predict live market results.",
  },
  {
    title: "2. Not financial advice",
    body: "Market data, charts, research, algo outputs, and wealth-desk features are for education and demonstration only. Nothing here is investment, legal, or tax advice.",
  },
  {
    title: "3. Your account",
    body: "You must keep your sign-in secure. Portfolios, orders, client books, and wallet activity are stored in our database and linked to your user account for this demo.",
  },
  {
    title: "4. Market data",
    body: "Quotes and prices may be delayed, incomplete, or inaccurate. Do not rely on QuantDesk data for real-money trading or regulatory filings.",
  },
  {
    title: "5. Acceptable use",
    body: "You may not abuse the service, access other users' data, misrepresent demo clients as real advisory relationships, or disrupt platform stability.",
  },
  {
    title: "6. Limitation of liability",
    body: "The platform is provided \"as is\" for learning. We are not liable for indirect or consequential damages from use of this demo environment.",
  },
] as const;

export const PRIVACY_SECTIONS = [
  {
    title: "1. What we collect",
    body: "Account email, display name, trading and portfolio data you create in the demo, client-book entries, wallet transactions, and session cookies needed to keep you signed in.",
  },
  {
    title: "2. How we use it",
    body: "To run the paper-trading demo, sync your books across devices, improve the product, and keep the service secure. We do not sell your personal data.",
  },
  {
    title: "3. Where data lives",
    body: "Information is stored in Supabase (cloud Postgres) under your authenticated user account. Do not enter real client PII unless you are authorized to do so in your environment.",
  },
  {
    title: "4. Retention",
    body: "Demo data remains until you delete it or close your account. You may request account deletion through your administrator or support channel in a production deployment.",
  },
  {
    title: "5. Your choices",
    body: "You can sign out at any time. You must accept these policies to use the dashboard after sign-in. Declining means you should not continue past this screen.",
  },
  {
    title: "6. Updates",
    body: "We may update this Privacy Policy. A new version may require you to read and accept again before accessing the app.",
  },
] as const;

export const LEGAL_WARNING =
  "Important: QuantDesk is for education and demonstration only. By checking the boxes below and continuing, you confirm you understand this is not live trading and not professional advice.";
