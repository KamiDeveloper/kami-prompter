import { 
  ErrorCode, LoadingStage, ModuleId, VscodeTheme, ApiKeyStatus
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
  | { type: "error"; code: ErrorCode; message: string; retryAfterMs?: number; requestId?: string }
  | { type: "loading"; module: ModuleId; stage: LoadingStage }
  | { type: "themeChanged"; theme: VscodeTheme }
  | { type: "apiKeyStatus"; status: ApiKeyStatus };

// --- Webview -> Extension ---
export type WebviewToExtensionMessage =
  | { type: "improvePrompt"; payload: ImprovePromptInput & { intelligenceLevel: number }; requestId?: string }
  | { type: "buildPrompt"; payload: BuildPromptInput & { intelligenceLevel: number }; requestId?: string }
  | { type: "suggestBuilderField"; payload: BuilderSuggestionInput & { intelligenceLevel: number }; requestId?: string }
  | { type: "generatePrd"; payload: PrdMakerInput & { intelligenceLevel: number }; requestId?: string }
  | { type: "regeneratePrdSection"; payload: PrdRegenerateSectionInput & { intelligenceLevel: number }; requestId?: string }
  | { type: "setApiKey"; payload: { key: string } }
  | { type: "openExternalLink"; payload: { url: string } }
  | { type: "copyToClipboard"; payload: { text: string } }
  | { type: "exportToFile"; payload: { content: string; filename: string } }
  | { type: "ready" };
