import { ModelParameters, SupportedModelId, ThinkingLevel } from '../types';

/**
 * Convierte las selecciones de modelo y nivel de pensamiento en parámetros estructurados para el SDK de Gemini.
 */
export class ModelSelector {
  
  /**
   * Construye los parámetros en base al modelo seleccionado y nivel de thinking.
   * @param modelId 'gemini-3.1-pro-preview' o 'gemini-3-flash-preview'
   * @param thinkingLevel 'low', 'medium', o 'high'
   * @param maxOutputOverrides Tokens máximos de salida personalizables por módulo.
   */
  public static getParameters(
    modelId: SupportedModelId, 
    thinkingLevel: ThinkingLevel, 
    maxOutputOverrides?: number
  ): ModelParameters {
    
    let temperature = 0.7; // default moderado
    let maxOutput = maxOutputOverrides;

    if (modelId === 'gemini-3-flash-preview') {
      temperature = 0.5;
      if (!maxOutput) maxOutput = 4000;
    } else {
      temperature = 0.7;
      if (!maxOutput) maxOutput = 8000;
    }

    return {
      modelId,
      temperature,
      topP: 0.95,
      maxOutputTokens: maxOutput,
      thinkingLevel
    };
  }

  /**
   * Informa si el modelo seleccionado es de altos límites de uso (Pro).
   */
  public static isUsingStrictLimitsModel(modelId: SupportedModelId): boolean {
    return modelId === 'gemini-3.1-pro-preview';
  }
}
