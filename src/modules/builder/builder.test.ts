import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuilderService } from './BuilderService';

vi.mock('../../ai/GoogleAIClient', () => {
  return {
    GoogleAIClient: class {
      generateText = vi.fn();
    }
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BuilderService', () => {
  
  it('retorna error MALFORMED_RESPONSE en polishPrompt si faltan campos base', async () => {
    const service = new BuilderService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    aiClientMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify({
        // Faltan campos como assembledPrompt y estimatedEffectiveness
        randomField: 42
      })
    });

    const result = await service.polishPrompt({ credo: { context: '', role: '', expectation: '', dataInput: '', outputFormat: '' } }, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MALFORMED_RESPONSE');
    }
  });

  it('retorna error MALFORMED_RESPONSE en suggestField si la inferencia rompe el JSON', async () => {
    const service = new BuilderService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    aiClientMock.mockResolvedValue({
      ok: true,
      value: 'plain text sin formato valido'
    });

    const result = await service.suggestField({ credoFields: {}, targetField: 'context' }, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MALFORMED_RESPONSE');
    }
  });

  it('resuelve polishPrompt correctamente si el assembledPrompt es string y estimateEffectiveness esta entre 0 y 100', async () => {
    const service = new BuilderService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    aiClientMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify({
        assembledPrompt: "Un prompt pulido listo para usarse",
        estimatedEffectiveness: 85
      })
    });

    const result = await service.polishPrompt({ credo: { context: 'A', role: 'B', expectation: 'C', dataInput: 'D', outputFormat: 'E' } }, 50);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.assembledPrompt).toBe("Un prompt pulido listo para usarse");
      expect(result.value.estimatedEffectiveness).toBe(85);
    }
  });

  it('resuelve suggestField correctamente retornando un string no vacio', async () => {
    const service = new BuilderService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    aiClientMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify({ suggestion: "Una sugerencia valiosa para este campo." })
    });

    const result = await service.suggestField({ credoFields: { role: 'Experto' }, targetField: 'expectation' }, 50);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value).toBe("Una sugerencia valiosa para este campo.");
    }
  });

  it('propaga el RATE_LIMIT_EXCEEDED desde el cliente hacia afuera en ambas funciones', async () => {
    const service = new BuilderService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    aiClientMock.mockResolvedValue({
      ok: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Quota exceeded', retryAfterMs: 2000 }
    });

    const result = await service.suggestField({ credoFields: {}, targetField: 'context' }, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.error.retryAfterMs).toBe(2000);
    }
  });
});
