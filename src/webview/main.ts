import './styles/base.css';
import './styles/components.css';

import { store, dispatch, KamiPrompterState } from './state/store';
import { App } from './components/App';
import { IPC } from './ipc';

/**
 * START FLIGHT: Inicialización Estricta de Capa 4 
 */

// 1. getState()
const savedState = IPC.getState() as Partial<KamiPrompterState> | undefined;

// 2. hidratar store (Rehidratación silenciosa sin roundtrips IPC)
if (savedState) {
  dispatch({ type: 'HYDRATE_STATE', payload: savedState });
}

// Persistir automáticamente el State hacia el runtime de VSCode cada vez que mute
store.subscribe((state) => {
  IPC.setState(state);
});

// Listener universal de mensajes IPC "Extension -> Webview"
window.addEventListener('message', event => {
  const message = event.data;
  
  // 5. recibir apiKeyStatus y themeChanged
  switch (message.type) {
    case 'apiKeyStatus':
      dispatch({ type: 'SET_API_KEY_STATUS', payload: message.status });
      break;
    case 'themeChanged':
      dispatch({ type: 'SET_THEME', payload: message.theme });
      break;
    case 'loading':
      if (message.module === 'improver') {
        dispatch({ type: 'UPDATE_IMPROVER_INPUT', payload: { loadingStage: message.stage } });
      } else if (message.module === 'builder') {
        dispatch({ type: 'UPDATE_BUILDER_INPUT', payload: { loadingStage: message.stage } });
      } else if (message.module === 'prd') {
        dispatch({ type: 'UPDATE_PRD_INPUT', payload: { loadingStage: message.stage } });
      }
      break;
    case 'error':
      const moduleId = message.module;
      const errorMsg = message.message;
      if (moduleId === 'improver') {
         dispatch({ type: 'UPDATE_IMPROVER_INPUT', payload: { error: errorMsg, loadingStage: null } });
      } else if (moduleId === 'builder') {
         dispatch({ type: 'UPDATE_BUILDER_INPUT', payload: { error: errorMsg, loadingStage: null } });
      } else if (moduleId === 'prd') {
         dispatch({ type: 'UPDATE_PRD_INPUT', payload: { error: errorMsg, loadingStage: null } });
      } else {
         dispatch({ type: 'SET_GLOBAL_ERROR', payload: errorMsg });
      }
      break;
    case 'improvePromptResult':
      dispatch({ type: 'UPDATE_IMPROVER_INPUT', payload: { result: message.payload, loadingStage: null, error: null } });
      break;
    case 'buildPromptResult':
      dispatch({ type: 'UPDATE_BUILDER_INPUT', payload: { result: message.payload, loadingStage: null, error: null } });
      break;
    case 'generatePrdResult':
      dispatch({ type: 'UPDATE_PRD_INPUT', payload: { result: message.payload, loadingStage: null, error: null } });
      break;
    case 'builderSuggestionResult':
      // As a simplification due to the PRD not being fully clear on suggestions placement,
      // we can do nothing here or just dump it. The user needs suggestion auto-population logic.
      // E.g. If we don't know the exact field it was suggested for, we can just log it or alert.
      console.log('Suggestion:', message.payload);
      dispatch({ type: 'UPDATE_BUILDER_INPUT', payload: { loadingStage: null, error: null } });
      break;
    case 'regenerateSectionResult':
      console.log('Section regenerated:', message.payload);
      dispatch({ type: 'UPDATE_PRD_INPUT', payload: { loadingStage: null, error: null } });
      break;
  }
});

// 3. Montar UI
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app-root');
  if (root) {
      root.innerHTML = ''; // Remueve splash
      const app = new App(root);
      app.render();
  }

  // 4. enviar "ready" 
  IPC.postMessage({ type: 'ready' });
});
