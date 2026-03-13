import * as vscode from 'vscode';

/**
 * Key bajo la que se almacena el API Key secreto en vscode.SecretStorage
 */
const API_KEY_SECRET_NAME = 'kamiPrompter.googleApiKey';

/**
 * Gestiona de manera segura todos los secretos de la extensión.
 * Es la ÚNICA clase con acceso a vscode.SecretStorage en todo el proyecto.
 */
export class SecretManager {
  private static instance: SecretManager;
  private secretStorage: vscode.SecretStorage;

  /**
   * Patrón Singleton: sólo debe ser inicializado una vez al activar la extensión.
   */
  private constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  /**
   * Inicializa la instancia única del SecretManager.
   * Debe llamarse dentro de la función activate(context).
   */
  public static init(context: vscode.ExtensionContext): void {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager(context);
    }
  }

  /**
   * Retorna la instancia única del SecretManager.
   * @throws Si no ha sido inicializada.
   */
  public static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      throw new Error("SecretManager no ha sido inicializado. Llama a init(context) primero.");
    }
    return SecretManager.instance;
  }

  /**
   * Obtiene la API Key de Gemini desde el SecretStorage de manera asíncrona.
   */
  public async getApiKey(): Promise<string | undefined> {
    return this.secretStorage.get(API_KEY_SECRET_NAME);
  }

  /**
   * Almacena de manera segura la nueva API Key.
   */
  public async storeApiKey(key: string): Promise<void> {
    if (!key || key.trim() === '') {
      throw new Error("API Key provista está vacía.");
    }
    await this.secretStorage.store(API_KEY_SECRET_NAME, key.trim());
  }

  /**
   * Elimina la API Key del almacén seguro (ej. si usuario quiere revocar acceso).
   */
  public async deleteApiKey(): Promise<void> {
    await this.secretStorage.delete(API_KEY_SECRET_NAME);
  }

  /**
   * Escucha cambios en los secretos (ej. si se sincroniza desde settings de VSCode u otra máquina si aplica).
   */
  public onDidChange(callback: (e: vscode.SecretStorageChangeEvent) => void): vscode.Disposable {
    return this.secretStorage.onDidChange(callback);
  }
}
