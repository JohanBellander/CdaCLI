export function generateRunId(options = {}) {
    const now = options.now ?? new Date();
    const randomFn = options.random ?? Math.random;
    const timestamp = now.toISOString();
    const randomValue = Math.floor(randomFn() * 36 ** 6)
        .toString(36)
        .padStart(6, "0");
    return `${timestamp}-${randomValue}`;
}
