import { Check, Minus } from "lucide-react";
import { COMPARISON_TABLE, PLAN_LABELS, type PlanId } from "@/data/pricing";

const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "agency", "enterprise"];

function CellValue({ value }: { value: string | number | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-emerald-500 mx-auto" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground/30 mx-auto" />
    );
  }
  return (
    <span className="text-sm font-medium">{value}</span>
  );
}

export function ComparisonTable() {
  return (
    <section className="border-y border-border/50 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
            Compare
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything included, by plan
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 pr-4 text-sm font-medium text-muted-foreground w-[30%]">
                  Feature
                </th>
                {PLAN_ORDER.map((planId) => (
                  <th
                    key={planId}
                    className="text-center py-3 px-2 text-sm font-medium w-[14%]"
                  >
                    {PLAN_LABELS[planId]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_TABLE.map((category) => (
                <>
                  <tr key={category.name}>
                    <td
                      colSpan={6}
                      className="pt-8 pb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {category.name}
                    </td>
                  </tr>
                  {category.features.map((feature) => (
                    <tr
                      key={feature.name}
                      className="border-b border-border/50"
                    >
                      <td className="py-3 pr-4 text-sm">{feature.name}</td>
                      {PLAN_ORDER.map((planId) => (
                        <td key={planId} className="py-3 px-2 text-center">
                          <CellValue value={feature.values[planId]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked view */}
        <div className="md:hidden space-y-8">
          {PLAN_ORDER.map((planId) => (
            <div key={planId} className="rounded-xl border border-border/50 bg-background p-6">
              <h3 className="text-base font-semibold mb-4">
                {PLAN_LABELS[planId]}
              </h3>
              {COMPARISON_TABLE.map((category) => (
                <div key={category.name} className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    {category.name}
                  </p>
                  <ul className="space-y-2">
                    {category.features.map((feature) => {
                      const val = feature.values[planId];
                      if (val === false) return null;
                      return (
                        <li
                          key={feature.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{feature.name}</span>
                          <span className="text-muted-foreground font-medium ml-2">
                            {val === true ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              val
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
