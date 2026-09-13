import axe from "axe-core";
import type { RenderResult } from "@testing-library/react";

/**
 * Runs axe-core against a rendered container and throws a readable report on
 * any violation. Used by route-family accessibility checks (audit #9).
 */
export async function expectNoA11yViolations(
  rendered: RenderResult,
  options: { impactThreshold?: axe.ImpactValue } = {},
): Promise<void> {
  const { violations } = await axe.run(rendered.container, {
    rules: {
      "color-contrast": { enabled: false },
      "region": { enabled: false },
    },
  });
  const threshold = options.impactThreshold ?? "minor";
  const order: axe.ImpactValue[] = ["minor", "moderate", "serious", "critical"];
  const blocking = violations.filter(
    (v) => (v.impact ? order.indexOf(v.impact) : 0) >= order.indexOf(threshold),
  );
  if (blocking.length > 0) {
    const report = blocking
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.help}\n  ${v.nodes
            .map((n) => n.target.join(" "))
            .join("\n  ")}`,
      )
      .join("\n");
    throw new Error(`axe violations:\n${report}`);
  }
}
