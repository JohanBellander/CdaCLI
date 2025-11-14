#!/usr/bin/env node

import { intro, outro, multiselect } from "@clack/prompts";

const SAMPLE_STATE = [
  {
    id: "mandatory-default",
    name: "Mandatory Default Constraint",
    optional: false,
    bundleEnabled: true,
    effectiveEnabled: true,
    category: "testing",
  },
  {
    id: "optional-enabled",
    name: "Optional Enabled Constraint",
    optional: true,
    bundleEnabled: true,
    effectiveEnabled: true,
    category: "testing",
  },
  {
    id: "optional-disabled",
    name: "Optional Disabled Constraint",
    optional: true,
    bundleEnabled: false,
    effectiveEnabled: false,
    category: "testing",
  },
];

async function main() {
  intro("cda config – library spike");

  const selected = await multiselect({
    message: "Toggle sample constraints (Space) then press Enter:",
    options: SAMPLE_STATE.map((entry) => ({
      value: entry.id,
      label: `${entry.id} – ${entry.name} (${entry.optional ? "optional" : "mandatory"})`,
      hint: entry.bundleEnabled ? "default:on" : "default:off",
      disabled: entry.optional ? false : "Mandatory constraint",
    })),
    initialValues: SAMPLE_STATE.filter((entry) => entry.effectiveEnabled).map(
      (entry) => entry.id,
    ),
    required: false,
  });

  outro(`Selected constraints: ${selected.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
