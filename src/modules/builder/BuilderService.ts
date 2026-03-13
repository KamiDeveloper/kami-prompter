import { 
  Result, ApiError, BuildPromptInput, BuildPromptOutput, BuilderSuggestionInput 
} from '../../types';
import { GoogleAIClient } from '../../ai/GoogleAIClient';
import { ModelSelector } from '../../ai/ModelSelector';
import { 
  BUILDER_POLISH_SYSTEM_PROMPT, BUILDER_SUGGESTION_SYSTEM_PROMPT 
} from '../../ai/system-prompts/builder';

export class BuilderService {
  private aiClient: GoogleAIClient;

  constructor() {
    this.aiClient = new GoogleAIClient();
  }

  /**
   * Pule y entrelaza un esquema CREDO usando Gemini.
   */
  public async polishPrompt(
    input: BuildPromptInput, 
    modelId: SupportedModelId, thinkingLevel: ThinkingLevel,
    abortSignal?: AbortSignal
  ): Promise<Result<BuildPromptOutput, ApiError>> {
    const parameters = ModelSelector.getParameters(modelId, thinkingLevel);
    
    const userPrompt = `
Por favor, pule el siguiente esquema CREDO en un único prompt fluido.
Context: ${input.credo.context || '(Vacío)'}
Role: ${input.credo.role || '(Vacío)'}
Expectation: ${input.credo.expectation || '(Vacío)'}
Data Input: ${input.credo.dataInput || '(Vacío)'}
Output Format: ${input.credo.outputFormat || '(Vacío)'}

Instrucciones adicionales del usuario: ${input.instructions || 'Ninguna'}
`;

    const result = await this.aiClient.generateText({
      prompt: userPrompt,
      systemInstruction: BUILDER_POLISH_SYSTEM_PROMPT,
      parameters,
      responseMimeType: 'application/json',
      abortSignal
    });

    if (!result.ok) {
      return result;
    }

    try {
      const parsed = JSON.parse(result.value);
      this.validatePolishSchema(parsed);
      return { ok: true, value: parsed as BuildPromptOutput };
    } catch (e) {
      return {
        ok: false,
        error: {
          code: 'MALFORMED_RESPONSE',
          message: 'La estructura devuelta para la corrección CREDO fue informateable.',
          details: String(e)
        }
      };
    }
  }

  /**
   * Pide una sugerencia predictiva al modelo para un campo en particular.
   */
  public async suggestField(
    input: BuilderSuggestionInput, 
    modelId: SupportedModelId, thinkingLevel: ThinkingLevel,
    abortSignal?: AbortSignal
  ): Promise<Result<string, ApiError>> {
    // Usar topP o temperatura un poco ajustada podría requerir parameters a medida,
    // pero heredamos los calculados por defecto.
    const parameters = ModelSelector.getParameters(modelId, thinkingLevel);

    const userPrompt = `
Campos existentes:
${JSON.stringify(input.credoFields, null, 2)}

Tu tarea: Generar y sugerir el contenido faltante para el campo '${input.targetField}'.
Solo devuelve el { "suggestion": "..." }
`;

    const result = await this.aiClient.generateText({
      prompt: userPrompt,
      systemInstruction: BUILDER_SUGGESTION_SYSTEM_PROMPT,
      parameters,
      responseMimeType: 'application/json',
      abortSignal
    });

    if (!result.ok) {
      return result;
    }

    try {
      const parsed = JSON.parse(result.value);
      if (typeof parsed.suggestion !== 'string') {
        throw new Error("Falta prop 'suggestion' de tipo string");
      }
      return { ok: true, value: parsed.suggestion };
    } catch (e) {
      return {
        ok: false,
        error: { code: 'MALFORMED_RESPONSE', message: 'Fallo al deducir sugerencia por campo.', details: String(e) }
      };
    }
  }

  private validatePolishSchema(parsed: unknown): void {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Resultado Polish vacío");
    }
    const record = parsed as Record<string, unknown>;
    if (typeof record.assembledPrompt !== 'string') {
      throw new Error("Falta property assembledPrompt");
    }
    if (typeof record.estimatedEffectiveness !== 'number') {
      throw new Error("Falta property estimatedEffectiveness");
    }
  }

}
