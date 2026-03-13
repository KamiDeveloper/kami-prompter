import { ErrorCode, ApiError, Result } from '../types';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[]; // e.g. [429, 500, 502, 503, 504]
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

/**
 * Analiza un error arrojado y lo normaliza en un ApiError predecible.
 */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    let code: ErrorCode = 'UNKNOWN';
    let retryAfter: number | undefined = undefined;

    if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
      code = 'RATE_LIMIT_EXCEEDED';
      // Intentar obtener "retry after" si está encapsulado de alguna forma en Google SDK
      retryAfter = 2000; // Fake fallback hasta que se parseen los headers formales.
    } else if (msg.includes('401') || msg.includes('403') || msg.includes('key')) {
      code = 'INVALID_API_KEY';
    } else if (msg.includes('timeout') || msg.includes('abort')) {
      code = 'TIMEOUT';
    } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
      code = 'NETWORK_ERROR';
    } else if (msg.includes('50') || msg.includes('server error')) {
      code = 'API_ERROR';
    } else {
      code = 'UNKNOWN';
    }

    return {
      code,
      message: error.message,
      originalName: error.name,
      retryAfterMs: retryAfter
    };
  }

  // Fallback genérico
  return {
    code: 'UNKNOWN',
    message: String(error)
  };
}

/**
 * Ejecuta una operación asíncrona con política de retry exponencial.
 *
 * @param operation La función a reintentar
 * @param config Configuración de retry
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Result<T, ApiError>> {
  let attempt = 0;
  let delay = config.initialDelayMs;

  while (attempt < config.maxAttempts) {
    try {
      const result = await operation();
      return { ok: true, value: result };
    } catch (e) {
      attempt++;
      const apiError = normalizeError(e);

      // Si no es un código reintenteable genérico (ej: Auth Error), salimos inmediatamente
      const isRateLimit = apiError.code === 'RATE_LIMIT_EXCEEDED';
      const isServerError = apiError.code === 'API_ERROR';
      const isNetwork = apiError.code === 'NETWORK_ERROR';

      // Mapearemos network (fetch) y server error a códigos reintenteables, rate limits también.
      const shouldRetry = isRateLimit || isServerError || isNetwork;

      if (!shouldRetry || attempt >= config.maxAttempts) {
        return { ok: false, error: apiError };
      }

      // Esperar antes del siguiente intento
      const currentDelay = apiError.retryAfterMs ?? delay;
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      // Incrementar delay para la próxima vez
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  // Fallback (teóricamente inalcanzable por la condicional superior)
  return { ok: false, error: { code: 'UNKNOWN', message: 'Exhausted retry bounds' } };
}
