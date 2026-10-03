// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('../utils/aiClient', () => ({ generateFlashcardsWithAI: mocks.generate }));
import { FlashcardsReview } from './FlashcardsReview';
import { createNewSimulado } from '../utils/provasManager';
import { flashcardSourceKey } from '../utils/flashcards';
import type { SimuladoData } from '../types';

const proof: SimuladoData = { ...createNewSimulado('Minha prova', 2), isCorrected: true, userAnswers: ['A', 'A'], keyAnswers: ['B', 'A'], extractedQuestions: [{ number: 1, subject: 'Matemática', statement: 'Quanto é 30% de 200?', options: [] }] };
const card = { id: 'card-1', subject: 'Matemática', topic: 'Porcentagem', front: 'Como calcular 30% de 200?', back: 'Multiplique 200 por 0,30. O resultado é 60.', questionNumbers: [1] };
const props = { signedIn: true, onSignIn: vi.fn(), onMapSubjects: vi.fn(), onSave: vi.fn() };
beforeEach(() => { vi.clearAllMocks(); mocks.generate.mockResolvedValue([card]); });
afterEach(cleanup);
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Flashcards de revisão' }));
describe('flashcards no fim da prova', () => {
  it('orienta a corrigir a prova antes de gerar qualquer cartão', () => {
    render(<FlashcardsReview {...props} proof={{ ...proof, isCorrected: false }}/>); open();
    expect(screen.getByRole('heading', { name: 'Primeiro, conclua sua prova' })).toBeTruthy(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('gera com os erros da prova, salva e revela a resposta somente ao virar', async () => {
    render(<FlashcardsReview {...props} proof={proof}/>); open(); fireEvent.click(screen.getByRole('button', { name: 'Gerar meus flashcards' }));
    await screen.findByRole('button', { name: 'Começar revisão' }); expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ sourceKey: flashcardSourceKey(proof), cards: [card] }));
    fireEvent.click(screen.getByRole('button', { name: 'Começar revisão' })); expect(screen.getByRole('heading', { name: card.front })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Revelar resposta' })); expect(screen.getByText(card.back).closest('article')?.getAttribute('aria-hidden')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Já sei' })); expect(props.onSave).toHaveBeenLastCalledWith(expect.objectContaining({ masteredCardIds: ['card-1'] }));
  });
  it('reutiliza cartões salvos sem chamar a IA e rejeita conjunto de uma correção antiga', () => {
    const deck = { sourceKey: flashcardSourceKey(proof), createdAt: new Date().toISOString(), cards: [card], masteredCardIds: [] };
    const { rerender } = render(<FlashcardsReview {...props} signedIn={false} proof={{ ...proof, flashcardDeck: deck }}/>); open();
    expect(screen.getByRole('button', { name: 'Começar revisão' })).toBeTruthy(); expect(mocks.generate).not.toHaveBeenCalled();
    rerender(<FlashcardsReview {...props} proof={{ ...proof, userAnswers: ['C', 'A'], flashcardDeck: deck }}/>);
    expect(screen.getByRole('button', { name: 'Gerar meus flashcards' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Começar revisão' })).toBeNull();
  });
  it('não salva uma geração que termina depois de trocar a prova ou conta', async () => {
    let finish!: (cards: typeof card[]) => void; mocks.generate.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { unmount } = render(<FlashcardsReview {...props} proof={proof}/>); open(); fireEvent.click(screen.getByRole('button', { name: 'Gerar meus flashcards' }));
    const signal = mocks.generate.mock.calls[0][1]; unmount(); expect(signal.aborted).toBe(true); finish([card]);
    await waitFor(() => expect(props.onSave).not.toHaveBeenCalled());
  });
  it('mostra contexto, explicação e origem sem permitir alterar a prova na consulta', async () => {
    const richer = { ...card, context: 'A prova pede 30% de uma quantidade de 200.', explanation: 'Converta 30% para 0,30 e multiplique pela quantidade.', example: 'Em um novo exemplo, 30% de 100 é 30.', pitfall: 'Não confunda 30% com 30 unidades.' };
    const deck = { sourceKey: flashcardSourceKey(proof), createdAt: new Date().toISOString(), cards: [richer], masteredCardIds: [] };
    render(<FlashcardsReview {...props} proof={{ ...proof, flashcardDeck: deck }}/>); open(); fireEvent.click(screen.getByRole('button', { name: 'Começar revisão' }));
    expect(screen.getByText(richer.context)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar questão 1 de origem' }));
    expect(screen.getByRole('dialog', { name: 'Questão 1 da prova' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar questão' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revelar resposta' }));
    expect(screen.getByText(richer.explanation).closest('article')?.getAttribute('aria-hidden')).toBe('false'); expect(screen.getByText(richer.example)).toBeTruthy(); expect(screen.getByText(richer.pitfall)).toBeTruthy();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('atualiza uma rodada antiga por solicitação e mantém seus cartões se a atualização falhar', async () => {
    const deck = { sourceKey: flashcardSourceKey(proof), createdAt: new Date().toISOString(), cards: [card], masteredCardIds: ['card-1'] };
    mocks.generate.mockRejectedValue(new Error('Tente novamente.'));
    render(<FlashcardsReview {...props} proof={{ ...proof, flashcardDeck: deck }}/>); open();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar cartões com mais contexto' }));
    await screen.findByRole('alert'); expect(props.onSave).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Começar revisão' })).toBeTruthy();
  });
});
