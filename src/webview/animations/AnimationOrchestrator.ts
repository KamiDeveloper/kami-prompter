export class AnimationOrchestrator {
  private static instance: AnimationOrchestrator;
  private activeAnimations: Map<string, Animation> = new Map();

  private constructor() {}

  public static getInstance(): AnimationOrchestrator {
    if (!AnimationOrchestrator.instance) {
      AnimationOrchestrator.instance = new AnimationOrchestrator();
    }
    return AnimationOrchestrator.instance;
  }

  /**
   * Ejecuta una animacion controlada mediante Web Animations API de forma imperativa.
   * Promesa que devuelve `true` si terminó normal, `false` si se omitió por reducción de movimiento.
   */
  public async animateElement(
    id: string,
    element: HTMLElement,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: KeyframeAnimationOptions
  ): Promise<boolean> {

    // PREFERS REDUCED MOTION CHECK
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // In reduced motion mode, skip animation entirely
      return false;
    }

    // Cancelar la previa si existiese
    this.cancel(id);

    const animation = element.animate(keyframes, options);
    this.activeAnimations.set(id, animation);

    try {
      await animation.finished;
      return true;
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
         throw e;
      }
      return false;
    } finally {
      if (this.activeAnimations.get(id) === animation) {
         this.activeAnimations.delete(id);
      }
    }
  }

  public cancel(id: string): void {
    const animation = this.activeAnimations.get(id);
    if (animation) {
      animation.cancel();
      this.activeAnimations.delete(id);
    }
  }

  public cancelAll(): void {
    for (const [id, animation] of this.activeAnimations.entries()) {
      animation.cancel();
    }
    this.activeAnimations.clear();
  }
}
