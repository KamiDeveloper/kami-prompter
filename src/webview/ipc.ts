import { WebviewToExtensionMessage } from '../types/messages';
import { KamiPrompterState } from './state/store';

declare function acquireVsCodeApi(): {
  postMessage(msg: any): void;
  getState(): KamiPrompterState | undefined;
  setState(state: KamiPrompterState): void;
};

let vscodeApi: any;

export const IPC = {
  getApi() {
    if (!vscodeApi) {
      vscodeApi = acquireVsCodeApi();
    }
    return vscodeApi;
  },
  postMessage(msg: WebviewToExtensionMessage) {
    this.getApi().postMessage(msg);
  },
  getState(): KamiPrompterState | undefined {
    return this.getApi().getState();
  },
  setState(state: KamiPrompterState) {
    this.getApi().setState(state);
  }
};
