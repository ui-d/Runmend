"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface ConnectionOption {
  id: string;
  display_name: string;
  platform: string;
}

interface ScenarioFormProps {
  workspaceId: string;
  workspaceSlug: string;
  connections: ConnectionOption[];
}

export function ScenarioForm({
  workspaceId,
  workspaceSlug,
  connections,
}: ScenarioFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [workflowExternalId, setWorkflowExternalId] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [inputsJson, setInputsJson] = useState(
    '[\n  { "label": "sample 1", "input_data": { "example": "replace me" } }\n]',
  );
  const [assertionsJson, setAssertionsJson] = useState(
    '[\n  { "assertion_type": "field_present", "config": { "field": "result" } }\n]',
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    let inputs: unknown;
    let assertions: unknown;
    try {
      inputs = JSON.parse(inputsJson);
      assertions = JSON.parse(assertionsJson);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid JSON";
      toast.error(`JSON parse error: ${msg}`);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          connectionId,
          name,
          workflowExternalId,
          workflowName: workflowName || null,
          inputs,
          assertions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create scenario");
        return;
      }
      toast.success("Scenario created");
      router.push(`/app/${workspaceSlug}/scenarios/${data.scenario.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="name">Scenario name</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lead Enrichment validator"
          />
        </div>

        <div>
          <Label htmlFor="connection">Connection</Label>
          <select
            id="connection"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
          >
            {connections.length === 0 && (
              <option value="">No connections — add one first</option>
            )}
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name} ({c.platform})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="workflow_id">Workflow ID</Label>
            <Input
              id="workflow_id"
              required
              value={workflowExternalId}
              onChange={(e) => setWorkflowExternalId(e.target.value)}
              placeholder="123456"
            />
          </div>
          <div>
            <Label htmlFor="workflow_name">Workflow display name</Label>
            <Input
              id="workflow_name"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Lead Enrichment"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="inputs">
            Inputs (JSON array of <code>{"{ label, input_data }"}</code>)
          </Label>
          <textarea
            id="inputs"
            rows={6}
            value={inputsJson}
            onChange={(e) => setInputsJson(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Up to 50 inputs per run. Drift detection requires at least 20.
          </p>
        </div>

        <div>
          <Label htmlFor="assertions">
            Assertions (JSON array of <code>{"{ assertion_type, config }"}</code>)
          </Label>
          <textarea
            id="assertions"
            rows={6}
            value={assertionsJson}
            onChange={(e) => setAssertionsJson(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Supported in v1: json_schema_valid, field_present, field_matches,
            field_in_set.
          </p>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting || connections.length === 0}>
          {submitting ? "Creating..." : "Create scenario"}
        </Button>
      </div>
    </form>
  );
}
