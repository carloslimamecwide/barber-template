export function messageFromResponse(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") return fallback;
  const value = (json as { error?: string | { message?: string } }).error;
  return typeof value === "string" ? value : value?.message ?? fallback;
}
