import { store, dispatch } from '../state/store';
import { IPC } from '../ipc';
import { effect } from '@preact/signals-core';
import { AnimationOrchestrator } from '../animations/AnimationOrchestrator';

export class ImproverView {
  private element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'kp-module-view';
    this.render();
    this.setupReactivity();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public setVisibility(isVisible: boolean) {
    const wasHidden = this.element.classList.contains('kp-hidden');
    this.element.classList.toggle('kp-hidden', !isVisible);
    
    if (isVisible && wasHidden) {
      this.element.classList.remove('kp-anim-tab');
      void this.element.offsetWidth; // Reflow
      this.element.classList.add('kp-anim-tab');
    } else if (!isVisible) {
      this.element.classList.remove('kp-anim-tab');
    }
  }

  private render() {
    this.element.innerHTML = `
      <div class="kp-form-group">
        <label>Prompt a Mejorar</label>
        <div style="position: relative; overflow: hidden; border-radius: 4px;">
           <textarea id="improver-input" class="kp-textarea" placeholder="Escribe aquí tu prompt..."></textarea>
           <div id="improver-scanner" class="kp-hidden" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index: 10;"></div>
        </div>
      </div>
      <div class="kp-form-group">
        <label>Nivel de Intervención</label>
        <select id="improver-level" class="kp-input">
          <option value="subtle">Sutil</option>
          <option value="moderate">Moderado</option>
          <option value="aggressive">Agresivo</option>
        </select>
      </div>
      <button id="improver-submit" class="kp-btn kp-btn-primary">Mejorar Prompt</button>
      
      <div id="improver-result-container" class="kp-result-box kp-hidden">
        <h3>Resultado</h3>
        <pre id="improver-result-text"></pre>
      </div>
    `;

    const submitBtn = this.element.querySelector('#improver-submit') as HTMLButtonElement;
    submitBtn.addEventListener('click', () => {
       submitBtn.classList.remove('kp-anim-btn-click');
       void submitBtn.offsetWidth;
       submitBtn.classList.add('kp-anim-btn-click');

       const state = store.value;
       IPC.postMessage({
         type: 'improvePrompt',
         payload: {
           originalPrompt: state.modules.improver.originalPrompt,
           interventionLevel: state.modules.improver.interventionLevel,
           modelId: store.value.modelId, thinkingLevel: store.value.thinkingLevel
         }
       });
    });

    const inputArea = this.element.querySelector('#improver-input') as HTMLTextAreaElement;
    inputArea.addEventListener('input', (e) => {
       dispatch({ 
         type: 'UPDATE_IMPROVER_INPUT', 
         payload: { originalPrompt: (e.target as HTMLTextAreaElement).value } 
       });
    });

    const levelSelect = this.element.querySelector('#improver-level') as HTMLSelectElement;
    levelSelect.addEventListener('change', (e) => {
       dispatch({ 
         type: 'UPDATE_IMPROVER_INPUT', 
         payload: { interventionLevel: (e.target as HTMLSelectElement).value as any } 
       });
    });
  }

  private setupReactivity() {
    const input = this.element.querySelector('#improver-input') as HTMLTextAreaElement;
    const select = this.element.querySelector('#improver-level') as HTMLSelectElement;
    const resultContainer = this.element.querySelector('#improver-result-container') as HTMLDivElement;
    const resultText = this.element.querySelector('#improver-result-text') as HTMLPreElement;
    const scannerEl = this.element.querySelector('#improver-scanner') as HTMLDivElement;

    const orchestrator = AnimationOrchestrator.getInstance();

    effect(() => {
      const state = store.value.modules.improver;
      
      if (input.value !== state.originalPrompt) {
         input.value = state.originalPrompt;
      }
      
      if (select.value !== state.interventionLevel) {
         select.value = state.interventionLevel;
      }
      
      // WAAPI anim scanner linking
      if (state.loadingStage && !scannerEl.classList.contains('kp-scan-active')) {
         scannerEl.classList.remove('kp-hidden');
         scannerEl.classList.add('kp-scan-active');
         orchestrator.animateElement(
           'improver-scanner-anim',
           scannerEl,
           [
             { background: 'linear-gradient(to bottom, transparent, rgba(127,119,221,0.2) 50%, transparent)', transform: 'translateY(-100%)' },
             { transform: 'translateY(100%)' }
           ],
           { duration: 1500, iterations: Infinity, easing: 'linear' }
         );
      } else if (!state.loadingStage && scannerEl.classList.contains('kp-scan-active')) {
         orchestrator.cancel('improver-scanner-anim');
         scannerEl.classList.add('kp-hidden');
         scannerEl.classList.remove('kp-scan-active');
      }

      const wasHidden = resultContainer.classList.contains('kp-hidden');
      resultContainer.classList.toggle('kp-hidden', !state.result);
      if (state.result) {
         if (wasHidden) {
            resultContainer.classList.remove('kp-anim-result-card');
            void resultContainer.offsetWidth;
            resultContainer.classList.add('kp-anim-result-card');
         }
         resultText.textContent = state.result.improvedPrompt;
      }
    });
  }
}
