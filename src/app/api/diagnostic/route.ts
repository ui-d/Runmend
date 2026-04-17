import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getProfileById as getDemoProfile } from "@/lib/profiles";
import { DiagnosticNarrative, getPlatformLabel } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildEnhancedPrompt } from "@/lib/diagnostic/enhanced-prompt";
import { diagnosticSchema, formatZodErrors } from "@/lib/validation/schemas";
import type { Database } from "@/lib/database.types";

const fallbackNarratives: Record<string, DiagnosticNarrative> = {
  "coastal-content": {
    overallHealth:
      "Coastal Content Agency's automation infrastructure is in a critical state. With a health score of 34/100, over half of the core business workflows have either stopped functioning or are producing incorrect outputs. The three critical failures — client onboarding, invoice generation, and social media scheduling — represent the agency's core revenue-generating operations. This isn't a case of minor degradation; these are complete workflow breakdowns that are actively costing the business money and damaging client relationships every day they remain unresolved.",
    mostDangerousIssue:
      "The invoice generation failure is the most dangerous issue because it has direct, compounding financial impact. Zero invoices have been sent in 19 days, representing approximately $50,400 in unbilled work. Unlike the onboarding or social media issues — which damage relationships but can be retroactively addressed — late invoicing creates a cash flow crisis and gives clients grounds to dispute charges. Every additional day increases the risk that clients will refuse to pay, claiming the work was never properly documented or that the billing period has lapsed. The QuickBooks OAuth token expiration is a 5-minute fix, but the financial recovery from 19 days of missed billing could take months.",
    recommendations:
      "Priority 1: Re-authenticate the QuickBooks connection in Make.com immediately and manually generate all 19 days of missed invoices before end of business today — frame them as a 'billing system maintenance' to clients. Priority 2: Reconnect the client onboarding webhook and manually onboard any clients who came in during the last 3 days — check your CRM for new deals that closed recently. Priority 3: Fix the Buffer API integration for social media scheduling and audit all client contracts to identify any that specify minimum posting frequency — reach out proactively to those clients before they notice the gap.",
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
      "Creator Stack's automation infrastructure is in excellent condition at 91/100. With only 15 scenarios to manage, the system is lean and focused. There are no critical failures — all core workflows (enrollment, payment processing, content delivery) are functioning correctly. The single warning about Teachable API rate limits is a forward-looking concern that only matters during high-volume launches, and the two info-level issues are efficiency optimizations rather than functional problems. This is a well-maintained setup that needs minor cleanup, not urgent intervention.",
    mostDangerousIssue:
      "The Teachable API rate limit issue deserves attention despite being only a warning, because its impact is concentrated during the highest-stakes moments: course launches. During the last launch, 34 students didn't receive their Day 1 content on time because the enrollment scenario hit the API rate limit. With the next launch in 2 weeks, this problem will repeat — and at scale, delayed content delivery during a launch creates a wave of support tickets, refund requests, and negative reviews that can tank a course's momentum. The fix is straightforward (adding a delay module), but it needs to be implemented before the launch, not during it.",
    recommendations:
      "Priority 1: Add a Sleep module with a 2-second delay between Teachable API calls in the enrollment scenario before your next launch in 2 weeks. Test it with a simulated batch of 50 enrollments to verify it stays within rate limits. Priority 2: Disable the legacy welcome email scenario — your ConvertKit sequence already handles this, and duplicate welcome emails confuse new students. Priority 3: Turn off the redundant Circle community access scenario since the native Teachable-Circle integration handles it. This will save ~45 Make.com operations per month.",
  },
  "infraflow-ops": {
    overallHealth:
      "InfraFlow DevOps' self-hosted n8n infrastructure is in a warning state at 52/100, with three critical failures that compound in ways unique to self-hosted environments. Unlike cloud platforms where infrastructure is managed for you, your n8n instance is suffering from memory exhaustion, a dead webhook tunnel, and a saturated database connection pool — all simultaneously. The combination means workflows are failing to execute, external events aren't reaching the system, and even the workflows that do trigger can't persist their results. The warning-level items around encryption key rotation and deprecated nodes add security and reliability risk on top of the operational failures.",
    mostDangerousIssue:
      "The expired webhook tunnel is the most dangerous issue because it has severed all communication between your n8n instance and the outside world. GitHub deploy notifications, PagerDuty incident routing, and Stripe payment events are all returning 502 errors. External services typically retry webhook deliveries for 72 hours before giving up permanently — you've already burned 18 of those hours. Once the retry window closes, those events are gone forever: missed deploy notifications won't retrigger, incident alerts won't re-fire, and Stripe payment events will need manual reconciliation. Every hour of delay shrinks your recovery window and increases the manual cleanup required.",
    recommendations:
      "Priority 1: Restore the webhook tunnel immediately — run cloudflared service install to set up Cloudflare Tunnel as a persistent system service with automatic reconnection. Once the tunnel is live, check GitHub, PagerDuty, and Stripe webhook delivery logs for failed events in the last 18 hours and replay them. Priority 2: Increase DB_POSTGRESDB_POOL_SIZE from 10 to 25 and restart n8n to clear the connection pool saturation. Deploy PgBouncer as a connection pooler for long-term stability. Priority 3: Set NODE_OPTIONS=--max-old-space-size=4096 and enable n8n queue mode with Redis to distribute execution load, preventing the memory exhaustion from recurring.",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = diagnosticSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }
    const { profileId } = parsed.data;

    // Try demo profile first (static data)
    const demoProfile = getDemoProfile(profileId);
    if (demoProfile) {
      return handleDemoDiagnostic(demoProfile, profileId);
    }

    // Authenticated path: database profile
    return handleDbDiagnostic(profileId);
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

async function handleDemoDiagnostic(
  profile: NonNullable<ReturnType<typeof getDemoProfile>>,
  profileId: string
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const fallback = fallbackNarratives[profileId];
    if (fallback) return NextResponse.json({ narrative: fallback });
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

  const prompt = `Analyze this automation setup and provide a diagnostic report.

Company: ${profile.name}
Platform: ${getPlatformLabel(profile.platform)}
Total Automations: ${profile.scenarioCount}
Industry: ${profile.industry}
Health Score: ${profile.healthScore}/100

Issues Found:
${issuesList}

Provide your analysis as a JSON object with exactly 3 fields:
- "overallHealth": One paragraph assessing the overall state of this automation stack
- "mostDangerousIssue": One paragraph identifying the single most dangerous issue and why it demands immediate attention
- "recommendations": One paragraph with three prioritized recommendations ranked by urgency (most urgent first)

Respond with ONLY the JSON object, no other text.`;

  return callClaude(apiKey, prompt, profileId);
}

async function handleDbDiagnostic(profileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch profile (RLS ensures user has access)
  const { data: profile } = await supabase
    .from("automation_profiles")
    .select("*, automation_issues(*)")
    .eq("id", profileId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Diagnostic service unavailable — API key not configured" },
      { status: 503 }
    );
  }

  // Return cached report if it exists and is newer than the last sync
  const admin = createAdminClient();
  const { data: cachedReport } = await admin
    .from("diagnostic_reports")
    .select("overall_health, most_dangerous, recommendations, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cachedReport) {
    const reportAge = Date.now() - new Date(cachedReport.created_at).getTime();
    const lastAudit = profile.last_audit_at
      ? new Date(profile.last_audit_at).getTime()
      : 0;
    const reportTime = new Date(cachedReport.created_at).getTime();

    // Use cache if report is less than 1 hour old AND generated after last sync
    if (reportAge < 60 * 60 * 1000 && reportTime >= lastAudit) {
      return NextResponse.json({
        narrative: {
          overallHealth: cachedReport.overall_health,
          mostDangerousIssue: cachedReport.most_dangerous,
          recommendations: cachedReport.recommendations,
        },
        cached: true,
      });
    }
  }

  // Fetch automations and execution logs for enhanced prompt
  const { data: automations } = await supabase
    .from("automations")
    .select("*")
    .eq("profile_id", profileId);

  const automationIds = (automations ?? []).map((a) => a.id);
  let executions: Database["public"]["Tables"]["execution_logs"]["Row"][] = [];
  if (automationIds.length > 0) {
    const { data } = await supabase
      .from("execution_logs")
      .select("*")
      .in("automation_id", automationIds)
      .order("started_at", { ascending: false })
      .limit(500);
    executions = data ?? [];
  }

  const prompt = buildEnhancedPrompt(
    profile,
    automations ?? [],
    executions ?? [],
    profile.automation_issues ?? []
  );

  const result = await callClaude(apiKey, prompt, profileId);

  // Persist report using admin client
  try {
    const narrative = await result.clone().json();
    if (narrative.narrative) {
      await admin.from("diagnostic_reports").insert({
        profile_id: profileId,
        triggered_by: "manual",
        overall_health: narrative.narrative.overallHealth,
        most_dangerous: narrative.narrative.mostDangerousIssue,
        recommendations: narrative.narrative.recommendations,
        model_used: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5-20250929",
        tokens_used: null,
      });
    }
  } catch {
    // Don't fail the request if persistence fails
  }

  return result;
}

async function callClaude(
  apiKey: string,
  prompt: string,
  profileId: string
): Promise<NextResponse> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system:
      "You are an automation health diagnostic AI. You analyze automation platform configurations and provide clear, actionable business-focused assessments. Write in a direct, professional tone. Respond with ONLY a valid JSON object — no markdown fences, no extra text.",
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Strip markdown code fences if present
  const raw = textContent.text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  try {
    const narrative: DiagnosticNarrative = JSON.parse(raw);
    return NextResponse.json({ narrative });
  } catch {
    const fallback = fallbackNarratives[profileId];
    if (fallback) return NextResponse.json({ narrative: fallback });
    throw new Error("Failed to parse diagnostic response");
  }
}
