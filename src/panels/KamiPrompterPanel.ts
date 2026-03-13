import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { 
  WebviewToExtensionMessage, 
  ExtensionToWebviewMessage 
} from '../types';
import { ModuleId, ErrorCode, ApiError, VscodeTheme, MODEL_IDS } from '../types/ai';

import { ImproverService } from '../modules/improver/ImproverService';
import { BuilderService } from '../modules/builder/BuilderService';
import { PrdService } from '../modules/prd/PrdService';
import { SecretManager } from '../storage/SecretManager';
import { GoogleAIClient } from '../ai/GoogleAIClient';

export class KamiPrompterPanel {
  public static currentPanel: KamiPrompterPanel | undefined;
  public static readonly viewType = 'kamiPrompter';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  
  private _activeControllers = new Map<ModuleId, AbortController>();

  private _improverService = new ImproverService();
  private _builderService = new BuilderService();
  private _prdService = new PrdService();

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // Patrón Singleton: Si existe, se revela en lugar de crear uno nuevo.
    if (KamiPrompterPanel.currentPanel) {
      KamiPrompterPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      KamiPrompterPanel.viewType,
      'Kami Prompter',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'src', 'webview')
        ]
      }
    );

    KamiPrompterPanel.currentPanel = new KamiPrompterPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();
    
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
        async (msg: WebviewToExtensionMessage) => {
            await this._handleMessage(msg);
        },
        null,
        this._disposables
    );

    vscode.window.onDidChangeActiveColorTheme(
      e => {
        const theme = this._getThemeKind(e.kind);
        this.postMessage({ type: "themeChanged", theme });
      },
      null,
      this._disposables
    );
  }

  private _getThemeKind(kind: vscode.ColorThemeKind): VscodeTheme {
    if (kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight) {
      return 'light';
    } else if (kind === vscode.ColorThemeKind.HighContrast) {
      return 'high-contrast';
    }
    return 'dark';
  }

  /**
   * Obtiene o resetea el AbortController para el módulo garantizando
   * que las respuestas no se crucen y no haya condiciones de carrera.
   */
  private getAbortController(moduleId: ModuleId): AbortController {
    this._activeControllers.get(moduleId)?.abort();
    const controller = new AbortController();
    this._activeControllers.set(moduleId, controller);
    return controller;
  }

  private postMessage(message: ExtensionToWebviewMessage) {
    this._panel.webview.postMessage(message);
  }

  private sendError(error: ApiError, requestId?: string) {
    const baseError = { type: "error" as const, code: error.code, message: error.message };
    const withRetry = error.retryAfterMs !== undefined ? { ...baseError, retryAfterMs: error.retryAfterMs } : baseError;
    this.postMessage(requestId !== undefined ? { ...withRetry, requestId } : withRetry);
  }

  private async _handleMessage(message: WebviewToExtensionMessage) {
    switch (message.type) {
      case "improvePrompt": {
         const { payload, requestId } = message;
         const { intelligenceLevel, ...input } = payload;
         const abort = this.getAbortController('improver');
         this.postMessage({ type: "loading", module: "improver", stage: "analyzing" });
         const result = await this._improverService.improvePrompt(input, intelligenceLevel, abort.signal);
         
         if (abort.signal.aborted) return;
         
         if (result.ok) {
           this.postMessage(requestId ? { type: "improvePromptResult", payload: result.value, requestId } : { type: "improvePromptResult", payload: result.value });
         } else {
           this.sendError(result.error, requestId);
         }
         break;
      }
      case "buildPrompt": {
         const { payload, requestId } = message;
         const { intelligenceLevel, ...input } = payload;
         const abort = this.getAbortController('builder');
         this.postMessage({ type: "loading", module: "builder", stage: "generating" });
         
         const result = await this._builderService.polishPrompt(input, intelligenceLevel, abort.signal);
         if (abort.signal.aborted) return;

         if (result.ok) {
           this.postMessage(requestId ? { type: "buildPromptResult", payload: result.value, requestId } : { type: "buildPromptResult", payload: result.value });
         } else {
           this.sendError(result.error, requestId);
         }
         break;
      }
      case "suggestBuilderField": {
         const { payload, requestId } = message;
         const { intelligenceLevel, ...input } = payload;
         const abort = this.getAbortController('builder');
         this.postMessage({ type: "loading", module: "builder", stage: "analyzing" });

         const result = await this._builderService.suggestField(input, intelligenceLevel, abort.signal);
         if (abort.signal.aborted) return;

         if (result.ok) {
           this.postMessage(requestId ? { type: "builderSuggestionResult", payload: result.value, requestId } : { type: "builderSuggestionResult", payload: result.value });
         } else {
           this.sendError(result.error, requestId);
         }
         break;
      }
      case "generatePrd": {
         const { payload, requestId } = message;
         const { intelligenceLevel, ...input } = payload;
         const abort = this.getAbortController('prd');
         this.postMessage({ type: "loading", module: "prd", stage: "generating" });

         const result = await this._prdService.generatePrd(input, intelligenceLevel, abort.signal);
         if (abort.signal.aborted) return;

         if (result.ok) {
           this.postMessage(requestId ? { type: "generatePrdResult", payload: result.value, requestId } : { type: "generatePrdResult", payload: result.value });
         } else {
           this.sendError(result.error, requestId);
         }
         break;
      }
      case "regeneratePrdSection": {
         const { payload, requestId } = message;
         const { intelligenceLevel, ...input } = payload;
         const abort = this.getAbortController('prd');
         this.postMessage({ type: "loading", module: "prd", stage: "formatting" });

         const result = await this._prdService.regenerateSection(input, intelligenceLevel, abort.signal);
         if (abort.signal.aborted) return;

         if (result.ok) {
           this.postMessage(requestId ? { type: "regenerateSectionResult", payload: result.value, requestId } : { type: "regenerateSectionResult", payload: result.value });
         } else {
           this.sendError(result.error, requestId);
         }
         break;
      }
      case "setApiKey": {
         const { key } = message.payload;
         const secretManager = SecretManager.getInstance();
         await secretManager.storeApiKey(key);
         this.postMessage({ type: "apiKeyStatus", status: "verifying" });

         const client = new GoogleAIClient();
         const result = await client.generateText({
           prompt: "Verifica que el modelo pueda responder con un Ok.",
           parameters: {
             modelId: MODEL_IDS.flash,
             temperature: 0,
             maxOutputTokens: 5
           }
         });

         if (result.ok) {
           this.postMessage({ type: "apiKeyStatus", status: "valid" });
         } else {
           this.postMessage({ type: "apiKeyStatus", status: "invalid" });
         }
         break;
      }
      case "copyToClipboard": {
         await vscode.env.clipboard.writeText(message.payload.text);
         break;
      }
      case "exportToFile": {
         const { content, filename } = message.payload;
         const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(filename) });
         if (uri) {
           await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
         }
         break;
      }
      case "ready": {
         const secretManager = SecretManager.getInstance();
         const key = await secretManager.getApiKey();
         this.postMessage({ type: "apiKeyStatus", status: key ? "valid" : "missing" });

         const theme = this._getThemeKind(vscode.window.activeColorTheme.kind);
         this.postMessage({ type: "themeChanged", theme });
         break;
      }
      default: {
        // Garantiza Exhaustividad en Build Time de TypeScript
        const _exhaustive: never = message;
        break;
      }
    }
  }

  public dispose() {
    KamiPrompterPanel.currentPanel = undefined;

    // Disparamos cascade cancel a requests de AI pendientes
    this._activeControllers.forEach(c => c.abort());
    this._activeControllers.clear();

    this._panel.dispose();

    // Vaciamos exhaustivamente los Event Listeners (Especialmente onDidReceiveMessage)
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = crypto.randomUUID();
    
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css'));
    const cspSource = webview.cspSource;

    const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    html = html.replace(/{{NONCE}}/g, nonce);
    html = html.replace(/{{CSP_SOURCE}}/g, cspSource);
    html = html.replace(/{{SCRIPT_URI}}/g, scriptUri.toString());
    html = html.replace(/{{STYLE_URI}}/g, styleUri.toString());

    return html;
  }
}
