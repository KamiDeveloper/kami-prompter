import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrdService } from './PrdService';
import { PrdMakerInput } from '../../types';

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

describe('PrdService', () => {

  const dummyInput: PrdMakerInput = {
    description: "Una app para testear",
    detailLevel: "basic",
    language: "es"
  };

  it('retorna MALFORMED_RESPONSE si faltan las 11 cláusulas obligatorias', async () => {
    const service = new PrdService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    // Gemini devuelve el objeto pero solo incluo 2 secciones
    aiClientMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify({
        markdownContent: "Doc corto",
        sections: [
          { id: "vision", title: "1. Vision", content: "..." },
          { id: "problem", title: "2. Problema", content: "..." }
        ]
      })
    });

    const result = await service.generatePrd(dummyInput, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MALFORMED_RESPONSE');
    }
  });

  it('retorna MALFORMED_RESPONSE si tiene exactamente 11 secciones pero con algun id invalido', async () => {
    const service = new PrdService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    // 10 originales + 1 inventada
    const badSections = [
      "vision", "problem", "goals", "audience", "features", 
      "flows", "non_functional", "architecture", "roadmap", 
      "risks"
    ].map(id => ({ id, title: id, content: "..." }));
    
    badSections.push({ id: "id_inventado", title: "Soy inventado", content: "..." });

    aiClientMock.mockResolvedValue({
      ok: true,
      value: JSON.stringify({
        markdownContent: "Doc corto",
        sections: badSections
      })
    });

    const result = await service.generatePrd(dummyInput, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('MALFORMED_RESPONSE');
    }
  });

  it('propaga error NETWORK_ERROR de forma fiel desde el AI Client', async () => {
    const service = new PrdService();
    const aiClientMock = (service as any).aiClient.generateText;
    
    aiClientMock.mockResolvedValue({
      ok: false,
      error: { code: 'NETWORK_ERROR', message: 'Failed to fetch' }
    });

    const result = await service.generatePrd(dummyInput, 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK_ERROR');
    }
  });
});
