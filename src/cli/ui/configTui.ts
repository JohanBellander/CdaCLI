import { intro, outro, multiselect, isCancel } from "@clack/prompts";

import type { ConfigConstraintState } from "../../core/configConstraintState.js";

export type ConfigCommandResult =
  | { status: "cancelled" }
  | { status: "saved"; state: ConfigConstraintState[] };

interface ConfigTuiOptions {
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  projectRoot: string;
}

export async function runConfigInteractiveUi(
  initialState: ConfigConstraintState[],
  options: ConfigTuiOptions,
): Promise<ConfigCommandResult> {
  if (initialState.length === 0) {
    return { status: "cancelled" };
  }

  intro("cda config – constraint activation");

  const selection = await multiselect({
    message:
      "Select which constraints should remain active. Arrow keys move, space toggles, Enter saves.",
    options: initialState.map((entry) => ({
      value: entry.id,
      label: formatChoiceLabel(entry),
      hint: createHint(entry),
      disabled: entry.toggleable ? false : "Mandatory constraint",
    })),
    initialValues: initialState
      .filter((entry) => entry.effectiveEnabled)
      .map((entry) => entry.id),
    required: false,
  });

  if (isCancel(selection)) {
    outro("Exited without saving changes.");
    return { status: "cancelled" };
  }

  const selected = new Set(selection);
  const updatedState = initialState.map((entry) =>
    entry.toggleable
      ? { ...entry, effectiveEnabled: selected.has(entry.id) }
      : { ...entry },
  );

  outro("Captured updated selections.");
  return { status: "saved", state: updatedState };
}

function formatChoiceLabel(entry: ConfigConstraintState): string {
  const defaultFlag = entry.bundleEnabled ? "default:on" : "default:off";
  return `${entry.id} – ${entry.name} (${defaultFlag}, ${entry.category})`;
}

function createHint(entry: ConfigConstraintState): string {
  return entry.effectiveEnabled ? "active" : "disabled";
}
