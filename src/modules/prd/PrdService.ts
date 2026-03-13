import { 
  Result, ApiError, PrdMakerInput, PrdMakerOutput, PrdRegenerateSectionInput 
} from '../../types';
import { GoogleAIClient } from '../../ai/GoogleAIClient';
import { ModelSelector } from '../../ai/ModelSelector';
import { PRD_SYSTEM_PROMPT, DETAIL_INSTRUCTIONS } from '../../ai/system-prompts/prd';

export class PrdService {
  private aiClient: GoogleAIClient;

  // Lógica pre-guardada de los IDs inquebrantables estipulados en el PRD.
  private static readonly MANDATORY_SECTION_IDS = [
    "vision", "problem", "goals", "audience", "features", 
    "flows", "non_functional", "architecture", "roadmap", 
    "risks", "open_questions"
  ] as const;

  constructor() {
    this.aiClient = new GoogleAIClient();
  }

  public async generatePrd(
    input: PrdMakerInput, 
    intelligence: number,
    abortSignal?: AbortSignal
  ): Promise<Result<PrdMakerOutput, ApiError>> {
    
    // Inyectar variables en el system Prompt
    const instructionStr = DETAIL_INSTRUCTIONS[input.detailLevel];
    let finalSystemPrompt = PRD_SYSTEM_PROMPT.replace('{{DETAIL_LEVEL_INSTRUCTION}}', instructionStr);
    finalSystemPrompt = finalSystemPrompt.replace('{{OUTPUT_LANGUAGE}}', input.language);

    const parameters = ModelSelector.getParameters(intelligence);
    
    // Prompt del usuario
    const userPrompt = `
Descripción Libre y Contextos del Usuario:
Descripción: ${input.description}
Tipo de Producto: ${input.productType || '(No especificado)'}
Audiencia Objetivo: ${input.targetAudience || '(No especificada)'}
Stack Tecnológico: ${input.techStack || '(No especificado)'}
`;

    const result = await this.aiClient.generateText({
      prompt: userPrompt,
      systemInstruction: finalSystemPrompt,
      parameters,
      responseMimeType: 'application/json',
      abortSignal
    });

    if (!result.ok) {
      return result;
    }

    try {
      const parsed = JSON.parse(result.value);
      this.validateSchema(parsed);
      return { ok: true, value: parsed as PrdMakerOutput };
    } catch (e) {
      return {
        ok: false,
        error: {
          code: 'MALFORMED_RESPONSE',
          message: 'La estructura de JSON devuelto para el PRD no incluye las 11 cláusulas obligatorias o difiere en estructura.',
          details: String(e)
        }
      };
    }
  }

  private validateSchema(parsed: any): void {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("La respuesta no contiene un Object JSON raíz.");
    }
    
    if (typeof parsed.markdownContent !== 'string') {
      throw new Error("Falta el text-blob 'markdownContent'.");
    }

    if (!Array.isArray(parsed.sections)) {
      throw new Error("Falta el array 'sections'.");
    }

    // Asegurarse de que el bot no se ha saltado ni una sola de las secciones
    const returnedIds = parsed.sections.map((s: any) => s.id);
    const missingIds = PrdService.MANDATORY_SECTION_IDS.filter(id => !returnedIds.includes(id));

    if (missingIds.length > 0) {
      throw new Error(`Secciones obligatorias omitidas por Gemini: ${missingIds.join(', ')}`);
    }

    // Validar estructura per-section
    for (const sec of parsed.sections) {
      if (typeof sec.id !== 'string' || typeof sec.title !== 'string' || typeof sec.content !== 'string') {
        throw new Error(`Objeto defectuoso encontrado en una sección: ${JSON.stringify(sec)}`);
      }
    }
  }

  public async regenerateSection(
    input: PrdRegenerateSectionInput,
    intelligence: number,
    abortSignal?: AbortSignal
  ): Promise<Result<string, ApiError>> {
    const parameters = ModelSelector.getParameters(intelligence);

    const userPrompt = `
Estás trabajando sobre la sección [${input.sectionId}] de un documento PRD.
Descripción original del proyecto: ${input.originalDescription}

Contenido actual de la sección:
${input.currentSectionContent}

Instrucción de iteración del usuario:
${input.instruction}

Reescribe el contenido de esta sección basándote en la instrucción.
Devuelve tu respuesta en JSON como: { "newContent": "tu texto markdown aquí" }
`;

    const result = await this.aiClient.generateText({
      prompt: userPrompt,
      systemInstruction: "Eres un experto en producto refinando PRDs. Devuelve SIEMPRE JSON { \"newContent\": \"...\" }",
      parameters,
      responseMimeType: 'application/json',
      abortSignal
    });

    if (!result.ok) {
      return result;
    }

    try {
      const parsed = JSON.parse(result.value);
      if (typeof parsed.newContent !== 'string') {
        throw new Error();
      }
      return { ok: true, value: parsed.newContent };
    } catch (e) {
      return {
        ok: false,
        error: { code: 'MALFORMED_RESPONSE', message: 'Respuesta inválida al regenerar sección.' }
      };
    }
  }
}
