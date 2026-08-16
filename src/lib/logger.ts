type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data,
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => write("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => write("warn", event, data),
  error: (event: string, error?: unknown, data: Record<string, unknown> = {}) =>
    write("error", event, {
      ...data,
      error: error instanceof Error ? error.message : String(error ?? "Erro desconhecido"),
    }),
};
