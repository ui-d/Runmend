export type IssueType =
  | "silent_failure"
  | "high_error_rate"
  | "error_spike"
  | "consecutive_failures"
  | "zombie_automation"
  | "credential_expiration";

export interface DetectorMeta {
  type: IssueType;
  label: string;
  shortLabel: string;
  description: string;
}

export const DETECTORS: readonly DetectorMeta[] = [
  {
    type: "zombie_automation",
    label: "Zombie automations",
    shortLabel: "Zombie",
    description:
      "Active but never executed. Trigger is likely misconfigured, or the scenario is no longer needed.",
  },
  {
    type: "silent_failure",
    label: "Silent failure",
    shortLabel: "Silent",
    description:
      "Previously active automations that have stopped executing. Trigger likely broken.",
  },
  {
    type: "high_error_rate",
    label: "High error rate",
    shortLabel: "Error rate",
    description:
      "More than 30% of the last 24 hours' runs failed. Data may be lost or actions incomplete.",
  },
  {
    type: "error_spike",
    label: "Error spike",
    shortLabel: "Error spike",
    description:
      "Today's error rate is more than 2× the 7-day baseline. Something recently broke.",
  },
  {
    type: "consecutive_failures",
    label: "Consecutive failures",
    shortLabel: "Consecutive",
    description:
      "5+ failed executions in a row. Usually expired credentials, schema drift, or a down service.",
  },
  {
    type: "credential_expiration",
    label: "Auth health",
    shortLabel: "Auth health",
    description:
      "Platform credentials have expired or will expire soon. All automations will stop on expiry.",
  },
];

const DETECTOR_BY_TYPE = new Map<IssueType, DetectorMeta>(
  DETECTORS.map((d) => [d.type, d])
);

export function getDetector(type: IssueType): DetectorMeta {
  const meta = DETECTOR_BY_TYPE.get(type);
  if (!meta) throw new Error(`Unknown detector type: ${type}`);
  return meta;
}

export function isIssueType(value: unknown): value is IssueType {
  return (
    typeof value === "string" &&
    DETECTOR_BY_TYPE.has(value as IssueType)
  );
}
