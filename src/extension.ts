import * as vscode from 'vscode';
import { KamiPrompterPanel } from './panels/KamiPrompterPanel';
import { SecretManager } from './storage/SecretManager';

export function activate(context: vscode.ExtensionContext) {
  // Inicializa el Singleton gestor de secretos (Cero leaks)
  SecretManager.init(context);

  // Registra el comando que levanta o revela la UI Principal
  const openCommand = vscode.commands.registerCommand('kamiPrompter.open', () => {
    KamiPrompterPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(openCommand);
}

export function deactivate() {}
