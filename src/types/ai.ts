/**
 * IDs de Módulos dentro del ecosistema Kami Prompter.
 */
export type ModuleId = 'improver' | 'builder' | 'prd';

/**
 * Estados posibles de la clave de API (Gemini).
 */
export type ApiKeyStatus = 'valid' | 'invalid' | 'verifying' | 'missing';

/**
 * Tipos de errores clasificados que la capa AI puede arrojar.
 * Todos estos deben transformarse amigablemente para la UI.
 */
export type ErrorCode = 
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_API_KEY'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'TIMEOUT'
  | 'MALFORMED_RESPONSE'
  | 'MODEL_UNAVAILABLE'
  | 'UNKNOWN';

/**
 * Formato universal para propagar errores de AI.
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  retryAfterMs?: number | undefined; // Específico para rate limits (429)
  originalName?: string;
  details?: unknown;
}

/**
 * Temas visuales transmitidos desde el Host VSC.
 */
export type VscodeTheme = 'light' | 'dark' | 'high-contrast';

/**
 * Etapas semánticas de latencia enviadas al webview para animaciones ricas.
 */
export type LoadingStage = 'analyzing' | 'generating' | 'formatting' | 'idle';

export const MODEL_IDS = {
  flash: 'gemini-3-flash-preview',
  pro: 'gemini-3.1-pro-preview'
} as const;

export type SupportedModelId = typeof MODEL_IDS[keyof typeof MODEL_IDS];

/**
 * Parámetros comunes de peticiones AI para los selectores de nivel de inteligencia.
 */
export interface ModelParameters {
  modelId: SupportedModelId;
  temperature: number;
  topP?: number;
  maxOutputTokens?: number;
}
