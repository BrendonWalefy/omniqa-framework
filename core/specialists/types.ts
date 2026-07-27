// Camada de agentes especialistas — personas de avaliação com rubrica própria que
// rodam sobre os artefatos coletados pelas Fases 2-4 (replay de conversas reais,
// screenshots, métricas de dashboard, insights gerados) e alimentam o relatório de
// melhoria contínua com achados categorizados por área de negócio, não só bug técnico.
//
// Cada persona só sugere — nunca escreve teste/código sozinha (humano no loop).

export type SpecialistPersona = 'sales-persuasion' | 'ux' | 'business' | 'ai-quality';

export type Finding = {
  persona: SpecialistPersona;
  severity: 'high' | 'medium' | 'low';
  category: string;
  summary: string;
  evidence: string;
  suggestion: string;
};

export type ConversationArtifact = {
  leadMessage: string;
  aiReply: string;
  commercialPolicy: string;
  toneOfVoice: string;
};
