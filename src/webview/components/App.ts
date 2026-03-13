import { store, dispatch } from '../state/store';
import { ImproverView } from './ImproverView';
import { BuilderView } from './BuilderView';
import { PrdView } from './PrdView';
import { OnboardingView } from './OnboardingView';
import { effect } from '@preact/signals-core';

export class App {
  private container: HTMLElement;
  private improverView: ImproverView;
  private builderView: BuilderView;
  private prdView: PrdView;
  private onboardingView: OnboardingView;

  constructor(container: HTMLElement) {
    this.container = container;
    this.improverView = new ImproverView();
    this.builderView = new BuilderView();
    this.prdView = new PrdView();
    this.onboardingView = new OnboardingView();
  }

  render() {
    this.container.innerHTML = `
      <div class="kp-container">
        <header class="kp-header" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--vscode-widget-border); margin-bottom: 15px;">
          <div style="font-weight: bold; font-size: 1.1em; padding-right: 15px; border-right: 1px solid var(--vscode-widget-border); display: flex; align-items: center; justify-content: center;">
             <span class="kp-anim-shimmer" style="display: inline-block; padding: 2px 8px; border-radius: 4px; color: var(--vscode-editor-foreground);">Kami Prompter</span>
          </div>
          <div class="kp-nav" style="flex: 1; padding-left: 15px; display: flex; gap: 8px;">
            <button id="nav-improver" class="kp-btn active">Improver</button>
            <button id="nav-builder" class="kp-btn">Builder</button>
            <button id="nav-prd" class="kp-btn">PRD Maker</button>
          </div>
          <div class="kp-models-container">
             <select id="model-selector" class="kp-dropdown">
                 <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                 <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
             </select>
             <select id="thinking-selector" class="kp-dropdown">
                 <option value="low">Thinking: Low</option>
                 <option value="medium">Thinking: Medium</option>
                 <option value="high">Thinking: High</option>
             </select>
          </div>
        </header>

        <main id="view-container">
          <!-- Views injected dynamically -->
          <div id="toast-container" class="kp-toast-container"></div>
        </main>
      </div>
    `;

    const viewContainer = this.container.querySelector('#view-container')!;
    viewContainer.appendChild(this.onboardingView.getElement());
    viewContainer.appendChild(this.improverView.getElement());
    viewContainer.appendChild(this.builderView.getElement());
    viewContainer.appendChild(this.prdView.getElement());

    this.bindEvents();
    this.setupReactivity();
  }

  private bindEvents() {
    const btnImprover = this.container.querySelector('#nav-improver') as HTMLButtonElement;
    const btnBuilder = this.container.querySelector('#nav-builder') as HTMLButtonElement;
    const btnPrd = this.container.querySelector('#nav-prd') as HTMLButtonElement;
    const modelSelector = this.container.querySelector('#model-selector') as HTMLSelectElement;
    const thinkingSelector = this.container.querySelector('#thinking-selector') as HTMLSelectElement;

    btnImprover.addEventListener('click', () => dispatch({ type: 'SET_ACTIVE_MODULE', payload: 'improver' }));
    btnBuilder.addEventListener('click', () => dispatch({ type: 'SET_ACTIVE_MODULE', payload: 'builder' }));
    btnPrd.addEventListener('click', () => dispatch({ type: 'SET_ACTIVE_MODULE', payload: 'prd' }));

    modelSelector.addEventListener('change', (e) => {
      dispatch({ type: 'SET_MODEL', payload: (e.target as HTMLSelectElement).value as any });
    });
    thinkingSelector.addEventListener('change', (e) => {
      dispatch({ type: 'SET_THINKING', payload: (e.target as HTMLSelectElement).value as any });
    });
  }

  private setupReactivity() {
    const btnImprover = this.container.querySelector('#nav-improver') as HTMLButtonElement;
    const btnBuilder = this.container.querySelector('#nav-builder') as HTMLButtonElement;
    const btnPrd = this.container.querySelector('#nav-prd') as HTMLButtonElement;
    const modelSelector = this.container.querySelector('#model-selector') as HTMLSelectElement;
    const thinkingSelector = this.container.querySelector('#thinking-selector') as HTMLSelectElement;
    const header = this.container.querySelector('.kp-header') as HTMLElement;
    const toastContainer = this.container.querySelector('#toast-container') as HTMLDivElement;
    let lastGlobalError: string | null = null;

    effect(() => {
      const state = store.value;
      const status = state.apiKeyStatus;

      // ── Lógica de onboarding ───────────────────────────────────
      // 'missing' o 'invalid' → mostrar onboarding, ocultar app normal
      // 'valid' → mostrar app normal
      // 'verifying' → no cambiar nada (se espera la respuesta del host)
      if (status === 'missing' || status === 'invalid') {
        this.onboardingView.setVisibility(true);
        header.style.display = 'none';
        this.improverView.setVisibility(false);
        this.builderView.setVisibility(false);
        this.prdView.setVisibility(false);
        return; // No procesar el resto del effect
      }

      if (status === 'valid') {
        this.onboardingView.setVisibility(false);
        header.style.display = 'flex';

        // Update Nav
        btnImprover.classList.toggle('active', state.activeModule === 'improver');
        btnBuilder.classList.toggle('active', state.activeModule === 'builder');
        btnPrd.classList.toggle('active', state.activeModule === 'prd');

        // Update Dropdowns
        modelSelector.value = state.modelId;
        thinkingSelector.value = state.thinkingLevel;

        // Check global error (Toasts)
        if (state.globalError != null && state.globalError !== lastGlobalError) {
          lastGlobalError = state.globalError;
          const toast = document.createElement('div');
          toast.className = 'kp-toast';
          toast.innerHTML = `<span>${state.globalError}</span> <button class="kp-toast-close">×</button>`;
          toastContainer.appendChild(toast);
          
          requestAnimationFrame(() => {
            toast.classList.add('kp-toast-show');
          });

          const closeBtn = toast.querySelector('.kp-toast-close');
          if (closeBtn) {
            closeBtn.addEventListener('click', () => {
              toast.classList.remove('kp-toast-show');
              setTimeout(() => toast.remove(), 300);
              dispatch({ type: 'SET_GLOBAL_ERROR', payload: null });
              lastGlobalError = null;
            });
          }

          setTimeout(() => {
             if (toast.parentElement) {
                toast.classList.remove('kp-toast-show');
                setTimeout(() => toast.remove(), 300);
                if (lastGlobalError === state.globalError) {
                   dispatch({ type: 'SET_GLOBAL_ERROR', payload: null });
                   lastGlobalError = null;
                }
             }
          }, 5000);
        }

        // Update View Visibility
        this.improverView.setVisibility(state.activeModule === 'improver');
        this.builderView.setVisibility(state.activeModule === 'builder');
        this.prdView.setVisibility(state.activeModule === 'prd');
      }
    });
  }
}
