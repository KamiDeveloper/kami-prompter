import * as vscode from 'vscode';
import { KamiPrompterPanel } from './panels/KamiPrompterPanel';
import { SecretManager } from './storage/SecretManager';

export function activate(context: vscode.ExtensionContext): void {
  // Inicializa el Singleton gestor de secretos (Cero leaks)
  SecretManager.init(context);

  // Registra el WebviewViewProvider para la vista de sidebar declarada en package.json.
  // Esto es obligatorio: las vistas "type": "webview" en el activity bar requieren este
  // registro para que VS Code pueda instanciarlas — sin él, la vista queda en carga infinita.
  const provider = new KamiPrompterPanel(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      KamiPrompterPanel.viewType,
      provider,
      // retainContextWhenHidden: true preserva el DOM y el JS del webview cuando el
      // usuario cambia a otro panel del sidebar, evitando recargas innecesarias.
      // Trade-off: mayor consumo de memoria a cambio de UX más fluida.
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Comando de paleta: revela la vista de sidebar sin crear un WebviewPanel separado.
  // El ID debe coincidir exactamente con el declarado en package.json "contributes.commands".
  const openCommand = vscode.commands.registerCommand('kamiprompter.start', () => {
    vscode.commands.executeCommand('workbench.view.extension.kami-prompter-sidebar');
  });

  context.subscriptions.push(openCommand);
}

export function deactivate(): void {}
