import { z } from "zod";

// --- Connections ---

export const connectionCreateSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  platform: z.enum(["make", "n8n"], {
    error: "Platform must be make or n8n",
  }),
  apiKey: z.string().min(1).optional(),
  instanceUrl: z.string().url("Invalid instance URL").optional(),
  zone: z
    .enum(["us1", "eu1", "eu2", "us2"], {
      error: "Invalid zone",
    })
    .optional(),
  displayName: z
    .string()
    .min(1, "Account label is required")
    .max(60, "Account label must be 60 characters or fewer")
    .optional(),
});

export type ConnectionCreateInput = z.infer<typeof connectionCreateSchema>;

// --- Schedules ---

const cronFieldRegex = /^(\*|(\d{1,2})(,\d{1,2})*)$/;

export const scheduleUpsertSchema = z.object({
  cronExpression: z
    .string()
    .regex(
      /^\S+\s\S+\s\S+\s\S+\s\S+$/,
      "Cron expression must have exactly 5 fields"
    )
    .refine(
      (val) => {
        const parts = val.split(/\s+/);
        return parts.every((p) => cronFieldRegex.test(p));
      },
      { message: "Invalid cron expression format" }
    )
    .refine(
      (val) => {
        const [minute, hour] = val.split(/\s+/);
        const m = parseInt(minute, 10);
        const h = parseInt(hour, 10);
        if (!isNaN(m) && (m < 0 || m > 59)) return false;
        if (!isNaN(h) && (h < 0 || h > 23)) return false;
        return true;
      },
      { message: "Minute must be 0-59, hour must be 0-23" }
    ),
  isActive: z.boolean().optional().default(true),
});

export type ScheduleUpsertInput = z.infer<typeof scheduleUpsertSchema>;

// --- Schedule toggle ---

export const scheduleToggleSchema = z.object({
  isActive: z.boolean({ error: "isActive is required" }),
});

// --- Notifications query ---

export const notificationQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  unreadOnly: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

// --- Billing checkout ---

export const checkoutSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  plan: z.enum(["starter", "pro"], {
    error: "Plan must be starter or pro",
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// --- Billing: Lifetime deal ---

export const claimLtdSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export type ClaimLtdInput = z.infer<typeof claimLtdSchema>;

// --- Billing portal ---

export const portalSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

// --- Diagnostic ---

export const diagnosticSchema = z.object({
  profileId: z.string().min(1, "profileId is required"),
});

// --- Mark all notifications read ---

export const markAllReadSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

// --- Dismiss issues ---

export const dismissIssuesSchema = z.object({
  issueIds: z
    .array(z.string().uuid("Invalid issue ID"))
    .min(1, "At least one issue ID is required")
    .max(100, "Cannot dismiss more than 100 issues at once"),
});

export type DismissIssuesInput = z.infer<typeof dismissIssuesSchema>;

// --- Helper to format Zod errors ---

export function formatZodErrors(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}
