import { Result, ApiError, ImprovePromptInput, ImprovePromptOutput } from '../../types';
import { GoogleAIClient } from '../../ai/GoogleAIClient';
import { ModelSelector } from '../../ai/ModelSelector';
import { IMPROVER_SYSTEM_PROMPT } from '../../ai/system-prompts/improver';

export class ImproverService {
  private aiClient: GoogleAIClient;

  constructor() {
    this.aiClient = new GoogleAIClient();
  }

  /**
   * Mejora un prompt usando el modelo configurado.
   *
   * @param input El prompt original y nivel de agresión
   * @param intelligence Nivel del 0 al 100 para selección de creatividad/modelo
   * @param abortSignal Señal de cancelación opcional
   * @returns Result con el output parseado o un ApiError validado
   */
  public async improvePrompt(
    input: ImprovePromptInput, 
    intelligence: number,
    abortSignal?: AbortSignal
  ): Promise<Result<ImprovePromptOutput, ApiError>> {
    
    // Convertir la agresividad en algo verbal para el prompt de usuario
    const userPrompt = `Aplica un nivel de intervención "${input.interventionLevel}" para mejorar este prompt:\n\n${input.originalPrompt}`;
    
    const parameters = ModelSelector.getParameters(intelligence);

    const result = await this.aiClient.generateText({
      prompt: userPrompt,
      systemInstruction: IMPROVER_SYSTEM_PROMPT,
      parameters,
      responseMimeType: 'application/json',
      abortSignal
    });

    if (!result.ok) {
      return result;
    }

    // Parsea y valida el esquema estricto
    try {
      const parsed = JSON.parse(result.value);
      
      this.validateSchema(parsed);
      
      return { ok: true, value: parsed as ImprovePromptOutput };
    } catch (e) {
      return {
        ok: false,
        error: {
          code: 'MALFORMED_RESPONSE',
          message: 'La respuesta de la IA no cumplió con la estructura JSON requerida.',
          details: e instanceof Error ? e.message : String(e)
        }
      };
    }
  }

  /**
   * Valida estructuralmente el Payload devuelto por Gemini.
   * Dispara una excepción si falta algún campo crucial.
   */
  private validateSchema(parsed: unknown): void {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Respuesta no es un objeto JSON.");
    }
    
    const record = parsed as Record<string, unknown>;

    if (typeof record.improvedPrompt !== 'string') {
      throw new Error("Falta campo 'improvedPrompt' o no es string.");
    }
    
    if (!Array.isArray(record.diffs)) {
      throw new Error("Falta array 'diffs'.");
    }

    for (const diff of record.diffs as Array<Record<string, unknown>>) {
      if (!['addition', 'deletion', 'modification', 'restructured'].includes(diff.type as string)) {
        throw new Error(`Tipo de diff desconocido: ${diff.type}`);
      }
      if (typeof diff.text !== 'string' || typeof diff.explanation !== 'string') {
        throw new Error("Formato de DiffAnnotation incorrecto.");
      }
    }

    if (!Array.isArray(record.qualityVectors)) {
      throw new Error("Falta array 'qualityVectors'.");
    }

    for (const vec of record.qualityVectors as Array<Record<string, unknown>>) {
      if (!['clarity', 'context', 'specificity', 'structure', 'role', 'examples', 'constraints'].includes(vec.name as string)) {
        throw new Error(`Vector de calidad desconocido: ${vec.name}`);
      }
      if (typeof vec.scoreBefore !== 'number' || typeof vec.scoreAfter !== 'number') {
        throw new Error("Puntuaciones de QualityVector deben ser números.");
      }
    }
  }
}
