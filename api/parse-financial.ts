import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { pdfBase64, fileType, textContent } = req.body as { pdfBase64?: string; fileType: string; textContent?: string };
  if (!pdfBase64 && !textContent) return res.status(400).json({ error: "No file provided" });

  const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const isExcel = fileType?.includes("excel") || fileType?.includes("spreadsheet") || fileType?.includes("xlsx");
  const mediaType = isExcel
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    : "application/pdf";

  const prompt = `You are a charter school financial analyst. Extract ALL financial data from this monthly close report and return it as structured JSON.

Extract:
- reportingPeriod: the month/period covered (e.g. "February 28, 2026")
- fiscalYear: e.g. "FY26"
- networkName: the school network name
- monthsElapsed: number of months in the fiscal year to date

P&L (all in thousands $000s):
- operationalRevenues: { actual, budget, variance }
- operationalExpenses: { actual, budget, variance }
- revenueMinusExpenses: { actual, budget, variance }
- netIncome: { actual, budget, variance }
- personnel: { actual, budget, variance }
- nonPersonnel: { actual, budget, variance }

Balance sheet:
- totalAssets: current value
- totalLiabilities: current value
- netAssets: current value
- cashAndInvestments: current value
- daysOfCashOnHand: number

Key metrics:
- dscr: debt service coverage ratio (number)
- dscrCovenant: the required minimum (usually 1.0)
- currentRatio: number
- currentRatioCovenant: required minimum (usually 1.1)
- netAssetRatio: percentage as number (e.g. 62 not 0.62)

Bond covenant compliance:
- covenants: [{ name, actual, required, status: "PASS" | "FAIL" | "WATCH" }]

Executive highlights:
- highlights: up to 5 key takeaways
- revenueNote: brief note on revenue performance
- expenseNote: brief note on expense drivers
- overallAssessment: one sentence overall financial health assessment

Return ONLY valid JSON. No markdown, no backticks, no explanation.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: textContent ? [
            { type: "text", text: "Here is the financial data extracted from the Excel file:\n\n" + textContent + "\n\n" + prompt },
          ] : [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: "Claude API error", detail: err.slice(0, 300) });
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    const raw = data.content?.[0]?.text ?? "";
    const clean = raw.replace(/```json\s*|```\s*/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return res.json({ success: true, data: parsed });
    } catch {
      return res.status(500).json({ error: "Failed to parse response", raw: raw.slice(0, 500) });
    }
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
