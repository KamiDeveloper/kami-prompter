import * as vscode from 'vscode';
import * as crypto from 'crypto';

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

/**
 * Proveedor del panel principal de Kami Prompter, registrado como WebviewViewProvider
 * para la vista de tipo "webview" declarada en package.json bajo "kamiPrompter.panel".
 *
 * @remarks
 * La decisión de usar WebviewViewProvider en lugar de createWebviewPanel() es forzada
 * por la arquitectura de package.json: las vistas de sidebar con "type": "webview" DEBEN
 * proveerse así. Un WebviewPanel standalone no satisface este contrato y resulta en el
 * estado de carga infinito que motivó este refactor.
 *
 * ADR referenciado: /docs/DECISIONS.md — ADR-001
 */
export class KamiPrompterPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'kamiPrompter.panel';

  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;

  // Disposables acumulados durante resolveWebviewView; se limpian en _disposeView()
  private _viewDisposables: vscode.Disposable[] = [];

  private _activeControllers = new Map<ModuleId, AbortController>();

  private _improverService = new ImproverService();
  private _builderService = new BuilderService();
  private _prdService = new PrdService();

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  /**
   * VS Code llama a este método cuando la vista necesita ser mostrada por primera vez,
   * o cuando es recreada tras ser destruida (solo relevante si retainContextWhenHidden = false).
   *
   * Aquí se configura el webview, se inyecta el HTML y se conectan todos los event listeners.
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    // Configuración de seguridad y recursos locales del webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist')]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Listener de mensajes entrantes del webview
    this._viewDisposables.push(
      webviewView.webview.onDidReceiveMessage(async (msg: WebviewToExtensionMessage) => {
        await this._handleMessage(msg);
      })
    );

    // Listener de cambio de tema del editor
    this._viewDisposables.push(
      vscode.window.onDidChangeActiveColorTheme(e => {
        const theme = this._getThemeKind(e.kind);
        this.postMessage({ type: 'themeChanged', theme });
      })
    );

    // Limpieza cuando VS Code destruye la vista
    webviewView.onDidDispose(() => this._disposeView(), null, this._viewDisposables);
  }

  /**
   * Limpieza ordenada: cancela requests de AI pendientes y elimina todos los event listeners.
   * Solo se llama desde onDidDispose — no exponer como público para evitar disposals prematuros.
   */
  private _disposeView(): void {
    this._activeControllers.forEach(c => c.abort());
    this._activeControllers.clear();
    this._view = undefined;

    while (this._viewDisposables.length) {
      this._viewDisposables.pop()?.dispose();
    }
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

  private postMessage(message: ExtensionToWebviewMessage): void {
    this._view?.webview.postMessage(message);
  }

  private sendError(error: ApiError, requestId?: string): void {
    const baseError = { type: 'error' as const, code: error.code, message: error.message };
    const withRetry = error.retryAfterMs !== undefined ? { ...baseError, retryAfterMs: error.retryAfterMs } : baseError;
    this.postMessage(requestId !== undefined ? { ...withRetry, requestId } : withRetry);
  }

  private async _handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case 'improvePrompt': {
        const { payload, requestId } = message;
        const { intelligenceLevel, ...input } = payload;
        const abort = this.getAbortController('improver');
        this.postMessage({ type: 'loading', module: 'improver', stage: 'analyzing' });
        const result = await this._improverService.improvePrompt(input, intelligenceLevel, abort.signal);

        if (abort.signal.aborted) return;

        if (result.ok) {
          this.postMessage(requestId ? { type: 'improvePromptResult', payload: result.value, requestId } : { type: 'improvePromptResult', payload: result.value });
        } else {
          this.sendError(result.error, requestId);
        }
        break;
      }
      case 'buildPrompt': {
        const { payload, requestId } = message;
        const { intelligenceLevel, ...input } = payload;
        const abort = this.getAbortController('builder');
        this.postMessage({ type: 'loading', module: 'builder', stage: 'generating' });

        const result = await this._builderService.polishPrompt(input, intelligenceLevel, abort.signal);
        if (abort.signal.aborted) return;

        if (result.ok) {
          this.postMessage(requestId ? { type: 'buildPromptResult', payload: result.value, requestId } : { type: 'buildPromptResult', payload: result.value });
        } else {
          this.sendError(result.error, requestId);
        }
        break;
      }
      case 'suggestBuilderField': {
        const { payload, requestId } = message;
        const { intelligenceLevel, ...input } = payload;
        const abort = this.getAbortController('builder');
        this.postMessage({ type: 'loading', module: 'builder', stage: 'analyzing' });

        const result = await this._builderService.suggestField(input, intelligenceLevel, abort.signal);
        if (abort.signal.aborted) return;

        if (result.ok) {
          this.postMessage(requestId ? { type: 'builderSuggestionResult', payload: result.value, requestId } : { type: 'builderSuggestionResult', payload: result.value });
        } else {
          this.sendError(result.error, requestId);
        }
        break;
      }
      case 'generatePrd': {
        const { payload, requestId } = message;
        const { intelligenceLevel, ...input } = payload;
        const abort = this.getAbortController('prd');
        this.postMessage({ type: 'loading', module: 'prd', stage: 'generating' });

        const result = await this._prdService.generatePrd(input, intelligenceLevel, abort.signal);
        if (abort.signal.aborted) return;

        if (result.ok) {
          this.postMessage(requestId ? { type: 'generatePrdResult', payload: result.value, requestId } : { type: 'generatePrdResult', payload: result.value });
        } else {
          this.sendError(result.error, requestId);
        }
        break;
      }
      case 'regeneratePrdSection': {
        const { payload, requestId } = message;
        const { intelligenceLevel, ...input } = payload;
        const abort = this.getAbortController('prd');
        this.postMessage({ type: 'loading', module: 'prd', stage: 'formatting' });

        const result = await this._prdService.regenerateSection(input, intelligenceLevel, abort.signal);
        if (abort.signal.aborted) return;

        if (result.ok) {
          this.postMessage(requestId ? { type: 'regenerateSectionResult', payload: result.value, requestId } : { type: 'regenerateSectionResult', payload: result.value });
        } else {
          this.sendError(result.error, requestId);
        }
        break;
      }
      case 'setApiKey': {
        const { key } = message.payload;
        const secretManager = SecretManager.getInstance();
        await secretManager.storeApiKey(key);
        this.postMessage({ type: 'apiKeyStatus', status: 'verifying' });

        const client = new GoogleAIClient();
        const result = await client.generateText({
          prompt: 'Verifica que el modelo pueda responder con un Ok.',
          parameters: {
            modelId: MODEL_IDS.flash,
            temperature: 0,
            maxOutputTokens: 5
          }
        });

        if (result.ok) {
          this.postMessage({ type: 'apiKeyStatus', status: 'valid' });
        } else {
          this.postMessage({ type: 'apiKeyStatus', status: 'invalid' });
        }
        break;
      }
      case 'copyToClipboard': {
        await vscode.env.clipboard.writeText(message.payload.text);
        break;
      }
      case 'exportToFile': {
        const { content, filename } = message.payload;
        const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(filename) });
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
        }
        break;
      }
      case 'openExternalLink': {
        await vscode.env.openExternal(vscode.Uri.parse(message.payload.url));
        break;
      }
      case 'ready': {
        const secretManager = SecretManager.getInstance();
        const key = await secretManager.getApiKey();
        this.postMessage({ type: 'apiKeyStatus', status: key ? 'valid' : 'missing' });

        const theme = this._getThemeKind(vscode.window.activeColorTheme.kind);
        this.postMessage({ type: 'themeChanged', theme });
        break;
      }
      default: {
        // Garantiza exhaustividad en build time de TypeScript
        const _exhaustive: never = message;
        break;
      }
    }
  }

  /**
   * Genera el HTML del Webview como string inline.
   *
   * No usa fs.readFileSync — el archivo index.html no se incluye en dist/ y
   * no está disponible en el VSIX instalado. El HTML se genera directamente
   * para garantizar que funcione tanto en desarrollo como en producción.
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = crypto.randomUUID();
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css'));
    const cspSource = webview.cspSource;

    return /* html */`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    script-src 'nonce-${nonce}';
    style-src ${cspSource} 'unsafe-inline';
    img-src ${cspSource} data:;
    connect-src https://generativelanguage.googleapis.com;
    font-src ${cspSource};
  ">
  <title>Kami Prompter</title>
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div id="app-root">
    <div class="kp-loading-splash" id="kp-boot-splash">Loading Kami Prompter...</div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
