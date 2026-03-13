import { store, dispatch } from '../state/store';
import { IPC } from '../ipc';
import { effect } from '@preact/signals-core';

export class BuilderView {
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
        <label>Rol</label>
        <input type="text" id="builder-role" class="kp-input" placeholder="Ej: Eres un ingeniero senior...">
      </div>
      <div class="kp-form-group">
        <label>Contexto</label>
        <textarea id="builder-context" class="kp-textarea" placeholder="Describe la situación actual..."></textarea>
      </div>
      <div class="kp-form-group">
        <label>Expectativa</label>
        <input type="text" id="builder-expectation" class="kp-input" placeholder="Ej: Quiero código limpio y testeado">
      </div>
      <div class="kp-form-group">
        <label>Datos de Entrada</label>
        <textarea id="builder-data" class="kp-textarea" placeholder="Pega el código o datos relevantes"></textarea>
      </div>
      <div class="kp-form-group">
        <label>Formato de Salida</label>
        <input type="text" id="builder-format" class="kp-input" placeholder="Ej: Markdown con bloques de código">
      </div>

      <button id="builder-submit" class="kp-btn kp-btn-primary">Pulir y Ensamblar Prompt</button>
      
      <div id="builder-result-container" class="kp-result-box kp-hidden">
        <h3>Prompt Ensamblado (CREDO)</h3>
        <pre id="builder-result-text"></pre>
      </div>
    `;

    const submitBtn = this.element.querySelector('#builder-submit') as HTMLButtonElement;
    submitBtn.addEventListener('click', () => {
       submitBtn.classList.remove('kp-anim-btn-click');
       void submitBtn.offsetWidth; // Trigger reflow para reiniciar la animación
       submitBtn.classList.add('kp-anim-btn-click');

       const state = store.value;
       IPC.postMessage({
         type: 'buildPrompt',
         payload: {
           credo: {
             context: state.modules.builder.context,
             role: state.modules.builder.role,
             expectation: state.modules.builder.expectation,
             dataInput: state.modules.builder.dataInput,
             outputFormat: state.modules.builder.outputFormat,
           },
           intelligenceLevel: state.intelligenceLevel
         }
       });
    });

    const bindInput = (id: string, key: keyof import('../state/store').BuilderState) => {
      const el = this.element.querySelector('#' + id) as HTMLInputElement | HTMLTextAreaElement;
      el.addEventListener('input', (e) => {
         dispatch({ 
           type: 'UPDATE_BUILDER_INPUT', 
           payload: { [key]: (e.target as HTMLInputElement).value } 
         });
      });
    };

    bindInput('builder-role', 'role');
    bindInput('builder-context', 'context');
    bindInput('builder-expectation', 'expectation');
    bindInput('builder-data', 'dataInput');
    bindInput('builder-format', 'outputFormat');
  }

  private setupReactivity() {
    const roleInput = this.element.querySelector('#builder-role') as HTMLInputElement;
    const contextInput = this.element.querySelector('#builder-context') as HTMLTextAreaElement;
    const expectationInput = this.element.querySelector('#builder-expectation') as HTMLInputElement;
    const dataInput = this.element.querySelector('#builder-data') as HTMLTextAreaElement;
    const formatInput = this.element.querySelector('#builder-format') as HTMLInputElement;
    
    const resultContainer = this.element.querySelector('#builder-result-container') as HTMLDivElement;
    const resultText = this.element.querySelector('#builder-result-text') as HTMLPreElement;

    effect(() => {
      const state = store.value.modules.builder;
      
      if (roleInput.value !== state.role) roleInput.value = state.role;
      if (contextInput.value !== state.context) contextInput.value = state.context;
      if (expectationInput.value !== state.expectation) expectationInput.value = state.expectation;
      if (dataInput.value !== state.dataInput) dataInput.value = state.dataInput;
      if (formatInput.value !== state.outputFormat) formatInput.value = state.outputFormat;
      
      const wasHidden = resultContainer.classList.contains('kp-hidden');
      resultContainer.classList.toggle('kp-hidden', !state.result);
      if (state.result) {
         if (wasHidden) {
            resultContainer.classList.remove('kp-anim-result-card');
            void resultContainer.offsetWidth; // Reflow
            resultContainer.classList.add('kp-anim-result-card');
         }
         resultText.textContent = state.result.assembledPrompt;
      }
    });
  }
}
