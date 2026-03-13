import { store, dispatch } from '../state/store';
import { ImproverView } from './ImproverView';
import { BuilderView } from './BuilderView';
import { PrdView } from './PrdView';
import { effect } from '@preact/signals-core';

export class App {
  private container: HTMLElement;
  private improverView: ImproverView;
  private builderView: BuilderView;
  private prdView: PrdView;

  constructor(container: HTMLElement) {
    this.container = container;
    this.improverView = new ImproverView();
    this.builderView = new BuilderView();
    this.prdView = new PrdView();
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
          <div class="kp-slider-wrapper">
             <label for="intelligence-slider">Intelligence</label>
             <input type="range" id="intelligence-slider" min="0" max="100" class="kp-slider">
             <span id="intelligence-val">50</span>
          </div>
        </header>
        
        <main id="view-container">
          <!-- Views injected dynamically -->
        </main>
      </div>
    `;

    const viewContainer = this.container.querySelector('#view-container')!;
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
    const slider = this.container.querySelector('#intelligence-slider') as HTMLInputElement;

    btnImprover.addEventListener('click', () => dispatch({ type: 'SET_ACTIVE_MODULE', payload: 'improver' }));
    btnBuilder.addEventListener('click', () => dispatch({ type: 'SET_ACTIVE_MODULE', payload: 'builder' }));
    btnPrd.addEventListener('click', () => dispatch({ type: 'SET_ACTIVE_MODULE', payload: 'prd' }));

    slider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      dispatch({ type: 'SET_INTELLIGENCE', payload: val });
    });
  }

  private setupReactivity() {
    const btnImprover = this.container.querySelector('#nav-improver') as HTMLButtonElement;
    const btnBuilder = this.container.querySelector('#nav-builder') as HTMLButtonElement;
    const btnPrd = this.container.querySelector('#nav-prd') as HTMLButtonElement;
    const slider = this.container.querySelector('#intelligence-slider') as HTMLInputElement;
    const sliderVal = this.container.querySelector('#intelligence-val') as HTMLSpanElement;

    effect(() => {
      const state = store.value;

      // Update Nav
      btnImprover.classList.toggle('active', state.activeModule === 'improver');
      btnBuilder.classList.toggle('active', state.activeModule === 'builder');
      btnPrd.classList.toggle('active', state.activeModule === 'prd');

      // Update Slider
      slider.value = state.intelligenceLevel.toString();
      sliderVal.textContent = state.intelligenceLevel.toString();

      // Update View Visibility
      this.improverView.setVisibility(state.activeModule === 'improver');
      this.builderView.setVisibility(state.activeModule === 'builder');
      this.prdView.setVisibility(state.activeModule === 'prd');
    });
  }
}
