import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImproverService } from './ImproverService';
import { ImprovePromptInput } from '../../types';

// Mock del cliente AI
vi.mock('../../ai/GoogleAIClient', () => {
  return {
    GoogleAIClient: class {
      generateText = vi.fn();
    }
  };
});

// Reseteamos el mock antes de cada test para no arrastrar estado
beforeEach(() => {
  vi.clearAllMocks();
});

describe('ImproverService', () => {
  
  const dummyInput: ImprovePromptInput = {
    originalPrompt: "Mejora este prompt pls",
    interventionLevel: "moderate"
  };

  it('retorna JSON válido exitoso comprobando todos los bounds', async () => {
    const service = new ImproverService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    // Simulamos respuesta válida de la API de Gemini
    aiClientMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify({
        improvedPrompt: "Prompt optimizado",
        diffs: [{ type: "addition", text: "opt", explanation: "clearer" }],
        qualityVectors: Array(7).fill(0).map((_, i) => ({
           name: ['clarity', 'context', 'specificity', 'structure', 'role', 'examples', 'constraints'][i],
           scoreBefore: 10, scoreAfter: 90
        }))
      })
    });

    const result = await service.improvePrompt(dummyInput, 50);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.improvedPrompt).toBe("Prompt optimizado");
      expect(result.value.qualityVectors).toHaveLength(7);
    }
  });

  it('retorna MALFORMED_RESPONSE si Gemini retorna JSON válido pero sin qualityVectors', async () => {
    const service = new ImproverService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    aiClientMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify({
        improvedPrompt: "Valid pero sin meta",
        diffs: [{ type: "addition", text: "A", explanation: "B" }]
        // NO HAY qualityVectors
      })
    });

    const result = await service.improvePrompt(dummyInput, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MALFORMED_RESPONSE');
    }
  });

  it('retorna MALFORMED_RESPONSE si Gemini retorna qualityVectors con vectores mal nombrados (o menos de 7 no permitidos)', async () => {
    const service = new ImproverService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    aiClientMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify({
        improvedPrompt: "Valid prompt",
        diffs: [],
        qualityVectors: [{ name: 'banana', scoreBefore: 0, scoreAfter: 10 }] // Vector inválido
      })
    });

    const result = await service.improvePrompt(dummyInput, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MALFORMED_RESPONSE');
      expect(result.error.message).toContain('estructura JSON');
    }
  });

  it('retorna MALFORMED_RESPONSE si Gemini retorna JSON con sintaxis inválida', async () => {
    const service = new ImproverService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    // JSON cortado / sintaxis errónea
    aiClientMock.mockResolvedValue({
      ok: true,
      value: '{"improvedPrompt": "Texto", "diffs": ['
    });

    const result = await service.improvePrompt(dummyInput, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MALFORMED_RESPONSE');
    }
  });

  it('propaga el error RATE_LIMIT_EXCEEDED crudo desde el GoogleAIClient sin alterarlo', async () => {
    const service = new ImproverService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    // Simular que el cliente capa red falló
    aiClientMock.mockResolvedValue({
      ok: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Quota exceeded', retryAfterMs: 5000 }
    });

    const result = await service.improvePrompt(dummyInput, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.error.retryAfterMs).toBe(5000);
    }
  });
});
