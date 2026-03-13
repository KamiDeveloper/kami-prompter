/**
 * Tests de integración para KamiPrompterPanel.
 *
 * Estrategia: mockeamos el SDK de vscode y los tres servicios de AI.
 * Instanciamos el Panel directamente (sin `createOrShow`) para poder
 * inyectar el WebviewPanel simulado y capturar los mensajes posteados
 * de vuelta al Webview.
 *
 * Verificamos que, para cada mensaje WebviewToExtension, el Panel
 * postea el ExtensionToWebview correcto.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock de vscode ───────────────────────────────────────────────────────────
vi.mock('vscode', () => {
  const ColorThemeKind = { Dark: 2, Light: 1, HighContrast: 3, HighContrastLight: 4 };
  return {
    ColorThemeKind,
    Uri: {
      joinPath: (...args: string[]) => ({ fsPath: args.join('/') }),
      file: (p: string) => ({ fsPath: p }),
    },
    window: {
      activeTextEditor: undefined,
      activeColorTheme: { kind: ColorThemeKind.Dark },
      onDidChangeActiveColorTheme: vi.fn(() => ({ dispose: vi.fn() })),
      createWebviewPanel: vi.fn(),
    },
    ViewColumn: { One: 1 },
    workspace: { fs: { readFile: vi.fn() } },
  };
});

// ─── Mock de los tres servicios de AI (cero red real) ─────────────────────────
vi.mock('../modules/improver/ImproverService');
vi.mock('../modules/builder/BuilderService');
vi.mock('../modules/prd/PrdService');
vi.mock('../storage/SecretManager');
vi.mock('../ai/GoogleAIClient');
vi.mock('fs', () => ({
  readFileSync: vi.fn(() =>
    '<html><head><meta http-equiv="Content-Security-Policy" content="{{CSP_SOURCE}} {{NONCE}}"><link href="{{STYLE_URI}}"></head><body><script nonce="{{NONCE}}" src="{{SCRIPT_URI}}"></script></body></html>'
  ),
  default: {
    readFileSync: vi.fn(() =>
      '<html><head><meta http-equiv="Content-Security-Policy" content="{{CSP_SOURCE}} {{NONCE}}"><link href="{{STYLE_URI}}"></head><body><script nonce="{{NONCE}}" src="{{SCRIPT_URI}}"></script></body></html>'
    ),
  }
}));
vi.mock('crypto', () => ({
  randomUUID: () => 'test-nonce-uuid-1234',
  default: { randomUUID: () => 'test-nonce-uuid-1234' },
}));

import { ImproverService } from '../modules/improver/ImproverService';
import { BuilderService } from '../modules/builder/BuilderService';
import { PrdService } from '../modules/prd/PrdService';
import { SecretManager } from '../storage/SecretManager';
import { KamiPrompterPanel } from './KamiPrompterPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Construye un WebviewPanel simulado y captura todos los mensajes posteados.
 * Devuelve el panel falso y un array reactivo con los mensajes emitidos.
 */
function buildFakePanel() {
  const postedMessages: unknown[] = [];

  let messageHandler: ((msg: unknown) => Promise<void>) | undefined;

  const fakeWebview = {
    html: '',
    cspSource: 'vscode-webview:',
    asWebviewUri: (u: unknown) => u,
    postMessage: (msg: unknown) => { postedMessages.push(msg); return Promise.resolve(true); },
    onDidReceiveMessage: (handler: (msg: unknown) => Promise<void>) => {
      messageHandler = handler;
      return { dispose: vi.fn() };
    },
  };

  const fakePanel = {
    webview: fakeWebview,
    title: '',
    reveal: vi.fn(),
    dispose: vi.fn(),
    onDidDispose: (cb: () => void) => { return { dispose: vi.fn() }; },
    onDidChangeViewState: () => ({ dispose: vi.fn() }),
    visible: true,
    viewColumn: 1,
  };

  /** Simula un mensaje enviado desde el Webview al Extension Host. */
  const sendMessage = async (msg: unknown) => {
    if (messageHandler) await messageHandler(msg);
  };

  return { fakePanel, postedMessages, sendMessage };
}

// Utility: acceder a métodos privados en tests de diseño (solo aquí).
function getPrivate<T>(obj: unknown, key: string): T {
  return (obj as Record<string, unknown>)[key] as T;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('KamiPrompterPanel — tests de integración de mensajes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetear el singleton entre tests
    KamiPrompterPanel.currentPanel = undefined;
  });

  // ── 1. improvePrompt ────────────────────────────────────────────────────────
  it('mensaje improvePrompt → postea improvePromptResult con el payload del servicio', async () => {
    const { fakePanel, postedMessages, sendMessage } = buildFakePanel();

    // Configurar la respuesta simulada del ImproverService
    const improverResult = {
      improvedPrompt: 'Prompt mejorado por el mock',
      diffs: [],
      qualityVectors: [],
    };
    vi.mocked(ImproverService.prototype.improvePrompt).mockResolvedValue({
      ok: true,
      value: improverResult,
    });

    // Instanciar el panel directamente inyectando el panel falso
    const extensionUri = { fsPath: '/fake/extension' } as unknown as import('vscode').Uri;
    // Usamos acceso directo al constructor (privado) mediante cast para tests
    const panel = new (KamiPrompterPanel as unknown as new (
      p: unknown, u: unknown
    ) => KamiPrompterPanel)(fakePanel, extensionUri);

    await sendMessage({
      type: 'improvePrompt',
      payload: {
        originalPrompt: 'Mi prompt original',
        interventionLevel: 'moderate',
        intelligenceLevel: 50,
      },
    });

    // Debe haberse posteado loading primero, luego el resultado
    const loadingMsg = postedMessages.find((m: unknown) => (m as { type: string }).type === 'loading');
    expect(loadingMsg).toBeDefined();
    expect((loadingMsg as { module: string }).module).toBe('improver');

    const resultMsg = postedMessages.find((m: unknown) => (m as { type: string }).type === 'improvePromptResult');
    expect(resultMsg).toBeDefined();
    expect((resultMsg as { payload: typeof improverResult }).payload).toEqual(improverResult);
  });

  // ── 2. buildPrompt ──────────────────────────────────────────────────────────
  it('mensaje buildPrompt → postea buildPromptResult con el payload del servicio', async () => {
    const { fakePanel, postedMessages, sendMessage } = buildFakePanel();

    const builderResult = {
      assembledPrompt: 'Prompt ensamblado CREDO',
      estimatedEffectiveness: 82,
    };
    vi.mocked(BuilderService.prototype.polishPrompt).mockResolvedValue({
      ok: true,
      value: builderResult,
    });

    const extensionUri = { fsPath: '/fake/extension' } as unknown as import('vscode').Uri;
    new (KamiPrompterPanel as unknown as new (p: unknown, u: unknown) => KamiPrompterPanel)(fakePanel, extensionUri);

    await sendMessage({
      type: 'buildPrompt',
      payload: {
        credo: {
          context: 'Eres un experto',
          role: 'Asistente',
          expectation: 'Respuesta clara',
          dataInput: 'Datos del usuario',
          outputFormat: 'Markdown',
        },
        instructions: 'Hazlo conciso',
        intelligenceLevel: 70,
      },
    });

    const loadingMsg = postedMessages.find((m: unknown) => (m as { type: string }).type === 'loading');
    expect(loadingMsg).toBeDefined();
    expect((loadingMsg as { module: string }).module).toBe('builder');

    const resultMsg = postedMessages.find((m: unknown) => (m as { type: string }).type === 'buildPromptResult');
    expect(resultMsg).toBeDefined();
    expect((resultMsg as { payload: typeof builderResult }).payload).toEqual(builderResult);
  });

  // ── 3. generatePrd ──────────────────────────────────────────────────────────
  it('mensaje generatePrd → postea generatePrdResult con el payload del servicio', async () => {
    const { fakePanel, postedMessages, sendMessage } = buildFakePanel();

    const prdResult = {
      markdownContent: '# PRD\n\n## Visión General\nEl producto resolverá...',
      sections: [
        { id: 's1', title: 'Visión General', content: 'El producto resolverá...' },
      ],
    };
    vi.mocked(PrdService.prototype.generatePrd).mockResolvedValue({
      ok: true,
      value: prdResult,
    });

    const extensionUri = { fsPath: '/fake/extension' } as unknown as import('vscode').Uri;
    new (KamiPrompterPanel as unknown as new (p: unknown, u: unknown) => KamiPrompterPanel)(fakePanel, extensionUri);

    await sendMessage({
      type: 'generatePrd',
      payload: {
        description: 'Una extensión de VSCode para mejorar prompts',
        productType: 'Extensión VSCode',
        targetAudience: 'Desarrolladores',
        techStack: 'TypeScript, VSCode API',
        detailLevel: 'standard',
        language: 'es',
        intelligenceLevel: 60,
      },
    });

    const loadingMsg = postedMessages.find((m: unknown) => (m as { type: string }).type === 'loading');
    expect(loadingMsg).toBeDefined();
    expect((loadingMsg as { module: string }).module).toBe('prd');

    const resultMsg = postedMessages.find((m: unknown) => (m as { type: string }).type === 'generatePrdResult');
    expect(resultMsg).toBeDefined();
    expect((resultMsg as { payload: typeof prdResult }).payload).toEqual(prdResult);
  });
});
