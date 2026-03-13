import { GoogleGenAI, GenerateContentConfig } from '@google/genai';
import { SecretManager } from '../storage/SecretManager';
import { Result, ApiError, ModelParameters } from '../types';
import { withRetry } from './retry';

export interface GenerateConfig {
  prompt: string;
  systemInstruction?: string | undefined;
  parameters: ModelParameters;
  responseMimeType?: string | undefined;
  abortSignal?: AbortSignal | undefined;
}

/**
 * Cliente Wrapper para el nuevo SDK unificado `@google/genai`.
 *
 * Migrado desde `@google/generative-ai` para aprovechar la API unificada
 * Google AI Studio / Vertex AI y el soporte nativo de Gemini 3.
 *
 * Gestiona de manera aislada la comunicación, errores y configuración
 * sin filtrar excepciones al resto del sistema.
 */
export class GoogleAIClient {

  /**
   * Crea una instancia de `GoogleGenAI` autenticada con la API Key actual.
   * Si no hay API key presente en el SecretStorage, devuelve un error.
   */
  private async getGenAI(): Promise<Result<GoogleGenAI, ApiError>> {
    let apiKey: string | undefined;
    try {
      apiKey = await SecretManager.getInstance().getApiKey();
    } catch (e) {
      return { ok: false, error: { code: 'UNKNOWN', message: 'No se pudo acceder al SecretStorage' } };
    }

    if (!apiKey) {
      return {
        ok: false,
        error: { code: 'INVALID_API_KEY', message: 'No hay API Key configurada. Por favor, añádela en la configuración.' }
      };
    }

    return { ok: true, value: new GoogleGenAI({ apiKey }) };
  }

  /**
   * Genera texto con retry automático en errores de servidor,
   * devolviendo siempre un Result estricto.
   *
   * @param config Parámetros de la petición: prompt, system instruction, parámetros del modelo.
   * @returns Result con el texto generado o un ApiError tipado con el código de fallo.
   *
   * @remarks
   * Esta función no lanza excepciones. Todos los fallos se retornan
   * como Result.error. El caller es responsable de manejar ambos casos.
   */
  public async generateText(config: GenerateConfig): Promise<Result<string, ApiError>> {
    const genAIResult = await this.getGenAI();

    if (!genAIResult.ok) {
      return genAIResult;
    }

    const ai = genAIResult.value;

    const op = async () => {
      // Verificar cancelación antes de iniciar la petición de red
      if (config.abortSignal?.aborted) {
        const err = new Error('Request aborted by AbortSignal');
        err.name = 'AbortError';
        throw err;
      }

      // Construir config condicionalmente: con exactOptionalPropertyTypes=true no se puede
      // asignar `undefined` a campos tipados como `number` en GenerateContentConfig.
      const generationConfig: GenerateContentConfig = {
        temperature: config.parameters.temperature,
      };

      if (config.parameters.topP !== undefined) {
        generationConfig.topP = config.parameters.topP;
      }
      if (config.parameters.maxOutputTokens !== undefined) {
        generationConfig.maxOutputTokens = config.parameters.maxOutputTokens;
      }

      if (config.responseMimeType) {
        generationConfig.responseMimeType = config.responseMimeType;
      }

      if (config.systemInstruction) {
        generationConfig.systemInstruction = config.systemInstruction;
      }

      const response = await ai.models.generateContent({
        model: config.parameters.modelId,
        contents: [
          {
            role: 'user',
            parts: [{ text: config.prompt }]
          }
        ],
        config: generationConfig,
      });

      const text = response.text;

      if (!text) {
        throw new Error('Respuesta del modelo malformada (vacía).');
      }

      return text;
    };

    return withRetry(op);
  }

}
