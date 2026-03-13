import { ModelParameters } from '../types';

/**
 * Convierte un nivel de inteligencia de UI [0-100] a una configuración rigurosa de modelo y parámetros.
 * Umbral: 0-70 usa Gemini 3 Flash. 71-100 usa Gemini 3.1 Pro.
 */
export class ModelSelector {
  
  /**
   * Determina los parámetros del modelo basándose en un score del 0 al 100.
   * @param intelligence Nivel seleccionado en el slider UI
   * @param maxOutputOverrides Posibilidad de sobre-escribir tokens por módulo si es muy verborrágico
   */
  public static getParameters(intelligence: number, maxOutputOverrides?: number): ModelParameters {
    // Clamping defensivo
    const clampedInt = Math.max(0, Math.min(100, intelligence));
    
    // De 0 a 70 -> Flash
    if (clampedInt <= 70) {
      // Mapeamos 0-70 a temperatura 0.0 - 1.0 (aprox)
      const temperature = Number((clampedInt / 70.0).toFixed(2));
      return {
        modelId: 'gemini-3-flash-preview',
        temperature: temperature,
        topP: 0.95,
        maxOutputTokens: maxOutputOverrides ?? 4000
      };
    } 
    
    // De 71 a 100 -> Pro
    // Mapeamos 71-100 a temperatura 0.4 - 1.0 (ya que pro por defecto es más creativo, ajustamos la escala)
    const proScale = (clampedInt - 71) / 29.0; 
    const temperature = Number((0.4 + (proScale * 0.6)).toFixed(2));
    
    return {
      modelId: 'gemini-3.1-pro-preview',
      temperature: temperature,
      topP: 1.0,
      maxOutputTokens: maxOutputOverrides ?? 8000
    };
  }

  /**
   * Informa a la interfaz si un nivel seleccionado cruzará el umbral de límite Pro (para mostrar un Warning visual en click).
   */
  public static isUsingStrictLimitsModel(intelligence: number): boolean {
    return intelligence > 70;
  }
}
