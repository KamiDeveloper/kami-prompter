import { 
  ErrorCode, LoadingStage, ModuleId, VscodeTheme, ApiKeyStatus, SupportedModelId, ThinkingLevel
} from './ai';
import { 
  ImprovePromptInput, ImprovePromptOutput, 
  BuildPromptInput, BuildPromptOutput, BuilderSuggestionInput,
  PrdMakerInput, PrdMakerOutput, PrdRegenerateSectionInput 
} from './modules';

// --- Extension -> Webview ---
export type ExtensionToWebviewMessage =
  | { type: "improvePromptResult"; payload: ImprovePromptOutput; requestId?: string }
  | { type: "buildPromptResult"; payload: BuildPromptOutput; requestId?: string }
  | { type: "builderSuggestionResult"; payload: string; requestId?: string }
  | { type: "generatePrdResult"; payload: PrdMakerOutput; requestId?: string }
  | { type: "regenerateSectionResult"; payload: string; requestId?: string }
  | { type: "error"; code: ErrorCode; message: string; module: ModuleId; retryAfterMs?: number; requestId?: string }
  | { type: "loading"; module: ModuleId; stage: LoadingStage }
  | { type: "themeChanged"; theme: VscodeTheme }
  | { type: "apiKeyStatus"; status: ApiKeyStatus };

// --- Webview -> Extension ---
export type WebviewToExtensionMessage =
  | { type: "improvePrompt"; payload: ImprovePromptInput & { modelId: SupportedModelId; thinkingLevel: ThinkingLevel }; requestId?: string }
  | { type: "buildPrompt"; payload: BuildPromptInput & { modelId: SupportedModelId; thinkingLevel: ThinkingLevel }; requestId?: string }
  | { type: "suggestBuilderField"; payload: BuilderSuggestionInput & { modelId: SupportedModelId; thinkingLevel: ThinkingLevel }; requestId?: string }
  | { type: "generatePrd"; payload: PrdMakerInput & { modelId: SupportedModelId; thinkingLevel: ThinkingLevel }; requestId?: string }
  | { type: "regeneratePrdSection"; payload: PrdRegenerateSectionInput & { modelId: SupportedModelId; thinkingLevel: ThinkingLevel }; requestId?: string }
  | { type: "setApiKey"; payload: { key: string } }
  | { type: "openExternalLink"; payload: { url: string } }
  | { type: "copyToClipboard"; payload: { text: string } }
  | { type: "exportToFile"; payload: { content: string; filename: string } }
  | { type: "ready" };
