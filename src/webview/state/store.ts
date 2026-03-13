import { signal } from '@preact/signals-core';
import { ModuleId, ApiKeyStatus, VscodeTheme, SupportedModelId, ThinkingLevel } from '../../types/ai';
import { ImprovePromptOutput, BuildPromptOutput, PrdMakerOutput } from '../../types/modules';

export interface ImproverState {
  originalPrompt: string;
  interventionLevel: 'subtle' | 'moderate' | 'aggressive';
  result: ImprovePromptOutput | null;
  loadingStage: string | null;
  error: string | null;
}

export interface BuilderState {
  context: string;
  role: string;
  expectation: string;
  dataInput: string;
  outputFormat: string;
  result: BuildPromptOutput | null;
  loadingStage: string | null;
  error: string | null;
}

export interface PrdState {
  description: string;
  productType: string;
  targetAudience: string;
  techStack: string;
  detailLevel: 'basic' | 'standard' | 'exhaustive';
  language: 'auto' | 'es' | 'en' | 'pt';
  result: PrdMakerOutput | null;
  loadingStage: string | null;
  error: string | null;
}

export interface KamiPrompterState {
  activeModule: ModuleId;
  modelId: SupportedModelId;
  thinkingLevel: ThinkingLevel;
  apiKeyStatus: ApiKeyStatus;
  theme: VscodeTheme;
  globalError: string | null;
  modules: {
    improver: ImproverState;
    builder: BuilderState;
    prd: PrdState;
  };
}

const DEFAULT_STATE: KamiPrompterState = {
  activeModule: 'improver',
  modelId: 'gemini-3.1-pro-preview',
  thinkingLevel: 'medium',
  globalError: null,
  apiKeyStatus: 'verifying',
  theme: 'dark',
  modules: {
    improver: {
      originalPrompt: '',
      interventionLevel: 'moderate',
      result: null,
      loadingStage: null,
      error: null
    },
    builder: {
      context: '',
      role: '',
      expectation: '',
      dataInput: '',
      outputFormat: '',
      result: null,
      loadingStage: null,
      error: null
    },
    prd: {
      description: '',
      productType: '',
      targetAudience: '',
      techStack: '',
      detailLevel: 'standard',
      language: 'auto',
      result: null,
      loadingStage: null,
      error: null
    }
  }
};

/**
 * Estado Centralizado Inmutable.
 * Cumple con AGENTS.md (página 5.3): Funciones puras para mutar el store.
 */
export const store = signal<KamiPrompterState>(DEFAULT_STATE);

export type Action = 
  | { type: 'SET_ACTIVE_MODULE'; payload: ModuleId }
  | { type: 'SET_MODEL'; payload: SupportedModelId }
  | { type: 'SET_THINKING'; payload: ThinkingLevel }
  | { type: 'SET_GLOBAL_ERROR'; payload: string | null }
  | { type: 'SET_API_KEY_STATUS'; payload: ApiKeyStatus }
  | { type: 'SET_THEME'; payload: VscodeTheme }
  | { type: 'HYDRATE_STATE'; payload: Partial<KamiPrompterState> }
  | { type: 'UPDATE_IMPROVER_INPUT'; payload: Partial<ImproverState> }
  | { type: 'UPDATE_BUILDER_INPUT'; payload: Partial<BuilderState> }
  | { type: 'UPDATE_PRD_INPUT'; payload: Partial<PrdState> };

export function dispatch(action: Action) {
  const s = store.value;
  let newState = { ...s };

  switch (action.type) {
    case 'SET_ACTIVE_MODULE':
      newState.activeModule = action.payload;
      break;
    case 'SET_MODEL':
      newState.modelId = action.payload;
      break;
    case 'SET_THINKING':
      newState.thinkingLevel = action.payload;
      break;
    case 'SET_GLOBAL_ERROR':
      newState.globalError = action.payload;
      break;
    case 'SET_API_KEY_STATUS':
      newState.apiKeyStatus = action.payload;
      break;
    case 'SET_THEME':
      newState.theme = action.payload;
      break;
    case 'HYDRATE_STATE':
      // Fusión profunda segura
      newState = {
        ...s,
        ...action.payload,
        modules: {
          improver: { ...s.modules.improver, ...(action.payload.modules?.improver || {}) },
          builder: { ...s.modules.builder, ...(action.payload.modules?.builder || {}) },
          prd: { ...s.modules.prd, ...(action.payload.modules?.prd || {}) },
        }
      };
      break;
    case 'UPDATE_IMPROVER_INPUT':
      newState.modules = { ...s.modules, improver: { ...s.modules.improver, ...action.payload } };
      break;
    case 'UPDATE_BUILDER_INPUT':
      newState.modules = { ...s.modules, builder: { ...s.modules.builder, ...action.payload } };
      break;
    case 'UPDATE_PRD_INPUT':
      newState.modules = { ...s.modules, prd: { ...s.modules.prd, ...action.payload } };
      break;
  }

  store.value = newState;
}

export function getStateSnapshot(): KamiPrompterState {
  return store.value;
}
