export function logDisabledConstraints(disabled, writer) {
    if (disabled.length === 0) {
        return;
    }
    for (const doc of disabled) {
        writer(`Constraint '${doc.meta.id}' disabled via configuration.`);
    }
}
