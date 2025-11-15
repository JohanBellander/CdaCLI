import { intro, outro, multiselect, isCancel } from "@clack/prompts";
export async function runConfigInteractiveUi(initialState, options) {
    if (initialState.length === 0) {
        return { status: "cancelled" };
    }
    intro([
        "cda config - constraint activation",
        "Labels include [group] prefixes so you can scan architecture vs patterns vs frameworks.",
    ].join("\n"));
    const selection = await multiselect({
        message: "Select which constraints should remain active (labels are prefixed with [group]). Arrow keys move, space toggles, Enter saves.",
        options: initialState.map((entry) => ({
            value: entry.id,
            label: formatChoiceLabel(entry),
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
    const updatedState = initialState.map((entry) => entry.toggleable
        ? { ...entry, effectiveEnabled: selected.has(entry.id) }
        : { ...entry });
    outro("Captured updated selections.");
    return { status: "saved", state: updatedState };
}
function formatChoiceLabel(entry) {
    return `[${entry.group}] ${entry.id} - ${entry.name}`;
}
function createHint(entry) {
    return entry.effectiveEnabled ? "active" : "disabled";
}
