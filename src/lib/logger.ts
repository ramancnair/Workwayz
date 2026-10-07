export const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta !== undefined ? meta : ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta !== undefined ? meta : ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta !== undefined ? meta : ''),
  debug: (msg: string, meta?: any) => console.debug(`[DEBUG] ${msg}`, meta !== undefined ? meta : ''),
};

export function logServerError(error: unknown, context?: Record<string, any>) {
  if (error instanceof Error) {
    logger.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context,
    });
  } else {
    logger.error(String(error), context);
  }
}

