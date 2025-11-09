import type { ConstraintDocument } from "../core/constraintLoader.js";

export function logDisabledConstraints(
  disabled: ConstraintDocument[],
  writer: (message: string) => void,
): void {
  if (disabled.length === 0) {
    return;
  }

  for (const doc of disabled) {
    writer(
      `Constraint '${doc.meta.id}' skipped (disabled by configuration).`,
    );
  }
}
