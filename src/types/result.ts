/**
 * Tipo central obligatorio para operaciones que pueden fallar.
 * Reemplaza el uso de excepciones silenciosas por un flujo de control explícito.
 */
export type Result<T, E = Error> = 
  | { ok: true; value: T } 
  | { ok: false; error: E };
