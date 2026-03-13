// -- MÓDULO IMPROVER --
export interface ImprovePromptInput {
  originalPrompt: string;
  interventionLevel: 'subtle' | 'moderate' | 'aggressive';
}

export interface DiffAnnotation {
  type: 'addition' | 'deletion' | 'modification' | 'restructured';
  text: string;
  explanation: string;
}

export interface QualityVector {
  name: 'clarity' | 'context' | 'specificity' | 'structure' | 'role' | 'examples' | 'constraints';
  scoreBefore: number; // 0-100
  scoreAfter: number;  // 0-100
}

export interface ImprovePromptOutput {
  improvedPrompt: string;
  diffs: DiffAnnotation[];
  qualityVectors: QualityVector[];
}

// -- MÓDULO BUILDER (CREDO) --
export interface CredoContext {
  context: string;
  role: string;
  expectation: string;
  dataInput: string;
  outputFormat: string;
}

export interface BuildPromptInput {
  credo: CredoContext;
  templateId?: string;
  // Instrucciones para el backend al clicar "Pulir con AI"
  instructions?: string; 
}

export interface BuildPromptOutput {
  assembledPrompt: string;
  /**
   * Puntuación de efectividad basada en completitud semántica del framework CREDO.
   * Rango: 0 al 100.
   */
  estimatedEffectiveness: number; 
}

export interface BuilderSuggestionInput {
  credoFields: Partial<CredoContext>;
  targetField: keyof CredoContext;
}

// -- MÓDULO PRD MAKER --
export type PrdDetailLevel = 'basic' | 'standard' | 'exhaustive';
export type OutputLanguage = 'auto' | 'es' | 'en' | 'pt';

export interface PrdMakerInput {
  description: string;
  productType?: string;
  targetAudience?: string;
  techStack?: string;
  detailLevel: PrdDetailLevel;
  language: OutputLanguage;
}

export interface PrdSectionInfo {
  id: string;
  title: string;
  content: string;
}

export interface PrdMakerOutput {
  markdownContent: string;
  // Obligatorio para permitir actualización granular por sección UI local
  sections: PrdSectionInfo[];
}

export interface PrdRegenerateSectionInput {
  sectionId: string;
  originalDescription: string;
  currentSectionContent: string;
  instruction: string;
}
