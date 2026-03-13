import { store, dispatch } from '../state/store';
import { effect } from '@preact/signals-core';
import { IPC } from '../ipc';

/**
 * Vista de onboarding para configurar la API Key de Google Gemini.
 * Se muestra cuando apiKeyStatus es 'missing' o 'invalid'.
 */
export class OnboardingView {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'kp-onboarding';
    this._render();
  }

  getElement(): HTMLElement {
    return this.container;
  }

  setVisibility(visible: boolean) {
    this.container.style.display = visible ? 'flex' : 'none';
  }

  private _render() {
    this.container.innerHTML = `
      <div class="kp-onboarding-card">
        <div class="kp-onboarding-logo">
          <span class="kp-anim-shimmer">Kami Prompter</span>
        </div>

        <p class="kp-onboarding-desc">
          Tu asistente de ingeniería de prompts con IA. Mejora, construye y genera documentación 
          de producto desde tu editor, usando Google Gemini.
        </p>

        <div class="kp-onboarding-step">
          <span class="kp-onboarding-step-num">1</span>
          <span>Obtén tu API Key gratuita en 
            <a href="https://aistudio.google.com/apikey" class="kp-link" id="apikey-link">
              Google AI Studio →
            </a>
          </span>
        </div>

        <div class="kp-onboarding-step">
          <span class="kp-onboarding-step-num">2</span>
          <span>Pega tu API Key aquí:</span>
        </div>

        <div class="kp-onboarding-input-row">
          <input
            type="password"
            id="kp-apikey-input"
            class="kp-input"
            placeholder="AIza..."
            autocomplete="off"
            spellcheck="false"
          >
        </div>

        <div id="kp-onboarding-error" class="kp-onboarding-error" style="display:none"></div>

        <button id="kp-apikey-save" class="kp-btn kp-btn-primary kp-onboarding-btn">
          Verificar y Guardar
        </button>

        <div id="kp-onboarding-status" class="kp-onboarding-status" style="display:none">
          <span class="kp-spinner"></span>
          <span id="kp-onboarding-status-text">Verificando API Key...</span>
        </div>

        <p class="kp-onboarding-hint">
          La key se almacena de manera segura en el Secret Storage de VS Code — nunca en texto plano.
          Free tier: 15 req/min con Gemini Flash, 2 req/min con Gemini Pro.
        </p>
      </div>
    `;

    this._bindEvents();
    this._setupReactivity();
  }

  private _bindEvents() {
    const saveBtn = this.container.querySelector('#kp-apikey-save') as HTMLButtonElement;
    const input = this.container.querySelector('#kp-apikey-input') as HTMLInputElement;
    const aiStudioLink = this.container.querySelector('#apikey-link') as HTMLAnchorElement;

    aiStudioLink.addEventListener('click', (e) => {
      e.preventDefault();
      IPC.postMessage({ type: 'openExternalLink', payload: { url: 'https://aistudio.google.com/apikey' } });
    });

    saveBtn.addEventListener('click', () => {
      const key = input.value.trim();
      const errorEl = this.container.querySelector('#kp-onboarding-error') as HTMLElement;

      if (!key) {
        errorEl.textContent = 'Por favor ingresa una API Key válida.';
        errorEl.style.display = 'block';
        return;
      }

      if (!key.startsWith('AIza')) {
        errorEl.textContent = 'Las API Keys de Google AI Studio comienzan con "AIza".';
        errorEl.style.display = 'block';
        return;
      }

      errorEl.style.display = 'none';
      IPC.postMessage({ type: 'setApiKey', payload: { key } });
    });

    // Enviar con Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveBtn.click();
      }
    });
  }

  private _setupReactivity() {
    const saveBtn = this.container.querySelector('#kp-apikey-save') as HTMLButtonElement;
    const statusEl = this.container.querySelector('#kp-onboarding-status') as HTMLElement;
    const statusText = this.container.querySelector('#kp-onboarding-status-text') as HTMLElement;
    const errorEl = this.container.querySelector('#kp-onboarding-error') as HTMLElement;

    effect(() => {
      const status = store.value.apiKeyStatus;

      if (status === 'verifying') {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Verificando...';
        statusEl.style.display = 'flex';
        statusText.textContent = 'Verificando API Key con Google Gemini...';
        errorEl.style.display = 'none';
      } else if (status === 'invalid') {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Verificar y Guardar';
        statusEl.style.display = 'none';
        errorEl.textContent = 'API Key inválida. Verifica que la copiaste correctamente y que pertenece a Google AI Studio.';
        errorEl.style.display = 'block';
      } else if (status === 'missing') {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Verificar y Guardar';
        statusEl.style.display = 'none';
        errorEl.style.display = 'none';
      }
    });
  }
}
