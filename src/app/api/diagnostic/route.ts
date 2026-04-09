import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getProfileById } from "@/lib/profiles";
import { DiagnosticNarrative } from "@/lib/types";

const fallbackNarratives: Record<string, DiagnosticNarrative> = {
  "coastal-content": {
    overallHealth:
      "Coastal Content Agency's automation infrastructure is in a critical state. With a health score of 34/100, over half of the core business workflows have either stopped functioning or are producing incorrect outputs. The three critical failures — client onboarding, invoice generation, and social media scheduling — represent the agency's core revenue-generating operations. This isn't a case of minor degradation; these are complete workflow breakdowns that are actively costing the business money and damaging client relationships every day they remain unresolved.",
    mostDangerousIssue:
      "The invoice generation failure is the most dangerous issue because it has direct, compounding financial impact. Zero invoices have been sent in 19 days, representing approximately $50,400 in unbilled work. Unlike the onboarding or social media issues — which damage relationships but can be retroactively addressed — late invoicing creates a cash flow crisis and gives clients grounds to dispute charges. Every additional day increases the risk that clients will refuse to pay, claiming the work was never properly documented or that the billing period has lapsed. The QuickBooks OAuth token expiration is a 5-minute fix, but the financial recovery from 19 days of missed billing could take months.",
    recommendations:
      "Priority 1: Re-authenticate the QuickBooks connection immediately and manually generate all 19 days of missed invoices before end of business today — frame them as a 'billing system maintenance' to clients. Priority 2: Reconnect the client onboarding webhook and manually onboard any clients who came in during the last 3 days — check your CRM for new deals that closed recently. Priority 3: Fix the Buffer API integration for social media scheduling and audit all client contracts to identify any that specify minimum posting frequency — reach out proactively to those clients before they notice the gap.",
  },
  "greenleaf-commerce": {
    overallHealth:
      "GreenLeaf Commerce's automation stack is in a warning state at 62/100 — not yet in crisis, but trending toward one. The two critical issues are both time-sensitive: the Stripe-Mailchimp integration has already been down for 14 days affecting 322+ customers, and the Google Sheets credential expires in 6 days which would knock out inventory sync. The warning-level issues around empty customer names and refund delays are eroding customer experience but aren't causing immediate revenue loss. Overall, the system needs urgent attention on the critical items and a scheduled maintenance pass on the warnings.",
    mostDangerousIssue:
      "The Stripe → Mailchimp post-purchase sequence failure is the most dangerous issue because of its silent, cumulative nature. For 14 days, every customer who completed a purchase received no order confirmation, no shipping update, and no review request. At 23 orders per day, that's approximately 322 customers who had a completely silent post-purchase experience. These customers are likely checking their spam folders, contacting support, or — worst case — filing chargebacks because they have no confirmation that their order was received. The longer this remains broken, the more customers you risk losing permanently. The Stripe webhook likely needs re-registration after Make.com's infrastructure update.",
    recommendations:
      "Priority 1: Check your Stripe dashboard → Developers → Webhooks and re-register the Make.com endpoint immediately. Then manually trigger the post-purchase sequence for the ~322 affected customers — a bulk re-send through Mailchimp with an apologetic 'your order update' subject line. Priority 2: Re-authenticate your Google Sheets connection now, before the credential expires in 6 days. Set a recurring calendar reminder for 85 days to prevent this from happening again. Priority 3: Add error handlers to the shipping label scenario — a simple Slack notification when the shipping API fails will prevent orders from shipping without tracking numbers.",
  },
  "creator-stack": {
    overallHealth:
      "Creator Stack's automation infrastructure is in excellent condition at 91/100. With only 15 automations to manage, the system is lean and focused. There are no critical failures — all core workflows (enrollment, payment processing, content delivery) are functioning correctly. The single warning about Teachable API rate limits is a forward-looking concern that only matters during high-volume launches, and the two info-level issues are efficiency optimizations rather than functional problems. This is a well-maintained setup that needs minor cleanup, not urgent intervention.",
    mostDangerousIssue:
      "The Teachable API rate limit issue deserves attention despite being only a warning, because its impact is concentrated during the highest-stakes moments: course launches. During the last launch, 34 students didn't receive their Day 1 content on time because the enrollment Zap hit the API rate limit. With the next launch in 2 weeks, this problem will repeat — and at scale, delayed content delivery during a launch creates a wave of support tickets, refund requests, and negative reviews that can tank a course's momentum. The fix is straightforward (adding a delay step), but it needs to be implemented before the launch, not during it.",
    recommendations:
      "Priority 1: Add a 2-second delay step between Teachable API calls in the enrollment Zap before your next launch in 2 weeks. Test it with a simulated batch of 50 enrollments to verify it stays within rate limits. Priority 2: Disable the legacy welcome email Zap — your ConvertKit sequence already handles this, and duplicate welcome emails confuse new students. Priority 3: Turn off the redundant Circle community access Zap since the native Teachable-Circle integration handles it. This will save ~45 Zapier tasks per month.",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json();

    if (!profileId || typeof profileId !== "string") {
      return NextResponse.json(
        { error: "profileId is required" },
        { status: 400 }
      );
    }

    const profile = getProfileById(profileId);
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const fallback = fallbackNarratives[profileId];
      if (fallback) {
        return NextResponse.json({ narrative: fallback });
      }
      return NextResponse.json(
        { error: "Diagnostic service unavailable" },
        { status: 503 }
      );
    }

    const issuesList = profile.issues
      .map(
        (issue, i) =>
          `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.name}\n   Automation: ${issue.automationName}\n   Impact: ${issue.businessImpact}`
      )
      .join("\n\n");

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 1024,
      system:
        "You are an automation health diagnostic AI. You analyze automation platform configurations and provide clear, actionable business-focused assessments. Write in a direct, professional tone. Do not use markdown formatting. Do not use bullet points or numbered lists — write in flowing paragraphs.",
      messages: [
        {
          role: "user",
          content: `Analyze this automation setup and provide a diagnostic report.

Company: ${profile.name}
Platform: ${profile.platform === "zapier" ? "Zapier" : "Make.com"}
Total Automations: ${profile.scenarioCount}
Industry: ${profile.industry}
Health Score: ${profile.healthScore}/100

Issues Found:
${issuesList}

Provide your analysis as a JSON object with exactly 3 fields:
- "overallHealth": One paragraph assessing the overall state of this automation stack
- "mostDangerousIssue": One paragraph identifying the single most dangerous issue and why it demands immediate attention
- "recommendations": One paragraph with three prioritized recommendations ranked by urgency (most urgent first)

Respond with ONLY the JSON object, no other text.`,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    try {
      const narrative: DiagnosticNarrative = JSON.parse(textContent.text);
      return NextResponse.json({ narrative });
    } catch {
      // If JSON parsing fails, use fallback
      const fallback = fallbackNarratives[profileId];
      if (fallback) {
        return NextResponse.json({ narrative: fallback });
      }
      throw new Error("Failed to parse diagnostic response");
    }
  } catch (err) {
    // Try fallback on any error
    try {
      const body = await request.clone().json();
      const fallback = fallbackNarratives[body.profileId];
      if (fallback) {
        return NextResponse.json({ narrative: fallback });
      }
    } catch {
      // Ignore fallback attempt errors
    }

    console.error("Diagnostic API error:", err);
    return NextResponse.json(
      { error: "Failed to generate diagnostic" },
      { status: 500 }
    );
  }
}
