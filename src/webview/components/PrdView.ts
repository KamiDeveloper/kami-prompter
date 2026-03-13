import { store, dispatch } from '../state/store';
import { IPC } from '../ipc';
import { effect } from '@preact/signals-core';
import { AnimationOrchestrator } from '../animations/AnimationOrchestrator';

export class PrdView {
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
        <label>Descripción del Producto</label>
        <textarea id="prd-desc" class="kp-textarea" placeholder="Idea principal de tu producto o feature..."></textarea>
      </div>
      <div class="kp-form-group">
        <label>Tipo de Producto</label>
        <input type="text" id="prd-type" class="kp-input" placeholder="Ej: App Web, Extensión, SaaS...">
      </div>
      <div class="kp-form-group">
        <label>Audiencia Objetivo</label>
        <input type="text" id="prd-audience" class="kp-input" placeholder="Ej: Developers, Estudiantes, Empresas...">
      </div>
      <div class="kp-form-group">
        <label>Tech Stack Sugerido</label>
        <input type="text" id="prd-stack" class="kp-input" placeholder="Ej: React, Node, PostgreSQL (opcional)">
      </div>
      
      <div class="kp-form-group">
        <label>Nivel de Detalle</label>
        <select id="prd-detail" class="kp-input">
          <option value="basic">Básico</option>
          <option value="standard">Estándar</option>
          <option value="exhaustive">Exhaustivo</option>
        </select>
      </div>

      <div class="kp-form-group">
        <label>Idioma</label>
        <select id="prd-lang" class="kp-input">
          <option value="auto">Automático</option>
          <option value="en">Inglés</option>
          <option value="es">Español</option>
          <option value="pt">Portugués</option>
        </select>
      </div>

      <button id="prd-submit" class="kp-btn kp-btn-primary">Generar PRD</button>
      
      <div id="prd-result-container" class="kp-result-box kp-hidden">
        <h3>Documento Generado</h3>
        <div id="prd-sections-container" style="display: flex; flex-direction: column; gap: 15px;"></div>
      </div>
    `;

    const submitBtn = this.element.querySelector('#prd-submit') as HTMLButtonElement;
    submitBtn.addEventListener('click', () => {
       submitBtn.classList.remove('kp-anim-btn-click');
       void submitBtn.offsetWidth;
       submitBtn.classList.add('kp-anim-btn-click');

       const state = store.value;
       IPC.postMessage({
         type: 'generatePrd',
         payload: {
           description: state.modules.prd.description,
           productType: state.modules.prd.productType,
           targetAudience: state.modules.prd.targetAudience,
           techStack: state.modules.prd.techStack,
           detailLevel: state.modules.prd.detailLevel,
           language: state.modules.prd.language,
           intelligenceLevel: state.intelligenceLevel
         }
       });
    });

    const bindInput = (id: string, key: keyof import('../state/store').PrdState) => {
      const el = this.element.querySelector('#' + id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      el.addEventListener('input', (e) => {
         dispatch({ 
           type: 'UPDATE_PRD_INPUT', 
           payload: { [key]: (e.target as HTMLInputElement).value } 
         });
      });
    };

    bindInput('prd-desc', 'description');
    bindInput('prd-type', 'productType');
    bindInput('prd-audience', 'targetAudience');
    bindInput('prd-stack', 'techStack');
    bindInput('prd-detail', 'detailLevel');
    bindInput('prd-lang', 'language');
  }

  private setupReactivity() {
    const descInput = this.element.querySelector('#prd-desc') as HTMLTextAreaElement;
    const typeInput = this.element.querySelector('#prd-type') as HTMLInputElement;
    const audienceInput = this.element.querySelector('#prd-audience') as HTMLInputElement;
    const stackInput = this.element.querySelector('#prd-stack') as HTMLInputElement;
    const detailSelect = this.element.querySelector('#prd-detail') as HTMLSelectElement;
    const langSelect = this.element.querySelector('#prd-lang') as HTMLSelectElement;
    
    const resultContainer = this.element.querySelector('#prd-result-container') as HTMLDivElement;
    const sectionsContainer = this.element.querySelector('#prd-sections-container') as HTMLDivElement;

    const orchestrator = AnimationOrchestrator.getInstance();

    effect(() => {
      const state = store.value.modules.prd;
      
      if (descInput.value !== state.description) descInput.value = state.description;
      if (typeInput.value !== state.productType) typeInput.value = state.productType;
      if (audienceInput.value !== state.targetAudience) audienceInput.value = state.targetAudience;
      if (stackInput.value !== state.techStack) stackInput.value = state.techStack;
      if (detailSelect.value !== state.detailLevel) detailSelect.value = state.detailLevel;
      if (langSelect.value !== state.language) langSelect.value = state.language;
      
      const wasHidden = resultContainer.classList.contains('kp-hidden');
      resultContainer.classList.toggle('kp-hidden', !state.result);
      
      if (state.result) {
         if (wasHidden) {
            resultContainer.classList.remove('kp-anim-result-card');
            void resultContainer.offsetWidth;
            resultContainer.classList.add('kp-anim-result-card');
         }
         
         // Renderizar secciones independientemente para permitir animar regeneraciones granulares
         state.result.sections.forEach(s => {
             let card = sectionsContainer.querySelector('#prd-section-' + s.id) as HTMLElement;
             let isNew = false;
             
             if (!card) {
                 card = document.createElement('div');
                 card.id = 'prd-section-' + s.id;
                 card.style.border = '1px solid var(--vscode-widget-border)';
                 card.style.padding = '10px';
                 card.style.borderRadius = '4px';
                 card.style.background = 'var(--vscode-editor-background)';
                 sectionsContainer.appendChild(card);
                 isNew = true;
             }
             
             const prevContent = card.getAttribute('data-content');
             if (prevContent !== s.content) {
                 const renderDefaultState = () => {
                     card.innerHTML = `
                         <h4 style="margin-top: 0; color: var(--vscode-editor-foreground);">${s.title}</h4>
                         <pre style="white-space: pre-wrap; font-family: var(--vscode-editor-font-family); color: var(--vscode-editor-foreground);">${s.content}</pre>
                         <button class="kp-btn kp-btn-regenerate" style="margin-top: 10px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);">Regenerar Sección</button>
                     `;
                     card.querySelector('.kp-btn-regenerate')!.addEventListener('click', handleRegenerateClick);
                 };

                 const handleRegenerateClick = () => {
                     card.innerHTML = `
                         <h4 style="margin-top: 0; color: var(--vscode-editor-foreground);">${s.title}</h4>
                         <pre style="white-space: pre-wrap; font-family: var(--vscode-editor-font-family); color: var(--vscode-editor-foreground);">${s.content}</pre>
                         <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                             <input type="text" class="kp-input kp-regenerate-input" placeholder="Instrucción para AI (ej. Extender detalle)...">
                             <div style="display: flex; gap: 8px;">
                                 <button class="kp-btn kp-btn-primary kp-regenerate-confirm">Confirmar</button>
                                 <button class="kp-btn kp-regenerate-cancel" style="background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);">Cancelar</button>
                             </div>
                         </div>
                     `;
                     
                     const inputEl = card.querySelector('.kp-regenerate-input') as HTMLInputElement;
                     inputEl.focus();
                     
                     card.querySelector('.kp-regenerate-cancel')!.addEventListener('click', renderDefaultState);
                     
                     card.querySelector('.kp-regenerate-confirm')!.addEventListener('click', () => {
                         const instruction = inputEl.value.trim() || 'Extender detalle de esta sección';
                         // Activar flip WAAPI
                         orchestrator.animateElement('flip-'+s.id, card, [
                             { transform: 'perspective(600px) rotateY(0deg)' },
                             { transform: 'perspective(600px) rotateY(180deg)' }
                         ], { duration: 1200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });

                         IPC.postMessage({
                             type: 'regeneratePrdSection',
                             payload: {
                                 sectionId: s.id,
                                 originalDescription: store.value.modules.prd.description,
                                 currentSectionContent: s.content,
                                 instruction,
                                 intelligenceLevel: store.value.intelligenceLevel
                             }
                         });
                         // disable buttons while waiting
                         inputEl.disabled = true;
                         (card.querySelector('.kp-regenerate-confirm') as HTMLButtonElement).disabled = true;
                         (card.querySelector('.kp-regenerate-cancel') as HTMLButtonElement).disabled = true;
                     });
                 };

                 renderDefaultState();
                 card.setAttribute('data-content', s.content);
                 
                 // Si la tarjeta ya existía, pero su contenido cambió (ha vuelto de regenerar), cancelar la vieja animación y girarla de vuelta.
                 if (!isNew) {
                     orchestrator.cancel('flip-'+s.id);
                     orchestrator.animateElement('flip-in-'+s.id, card, [
                         { transform: 'perspective(600px) rotateY(-90deg)' },
                         { transform: 'perspective(600px) rotateY(0deg)' }
                     ], { duration: 400, easing: 'ease-out' });
                 }
             }
         });
      }
    });
  }
}
