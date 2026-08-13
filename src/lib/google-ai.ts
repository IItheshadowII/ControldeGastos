export const DEFAULT_GOOGLE_MODEL = "gemini-3.5-flash";

export function normalizeGoogleModelName(modelName: string | undefined | null) {
    const raw = (modelName || "").trim();
    const normalized = raw.startsWith("models/") ? raw.slice("models/".length) : raw;

    // Gemini 2.0 was shut down on 2026-06-01. Transparently migrate legacy
    // values that may still be stored in the database, environment or .data.
    if (!normalized || normalized.startsWith("gemini-2.0")) {
        return DEFAULT_GOOGLE_MODEL;
    }

    return normalized;
}
