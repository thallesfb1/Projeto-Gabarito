// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QuestionGrid } from './QuestionGrid';
beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe(){} disconnect(){} }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('abertura do enunciado pelo cartão', () => {
  it('abre pelo número e pelo espaço externo às alternativas, sem abrir ao responder', () => {
    const open = vi.fn(); const answer = vi.fn();
    render(<QuestionGrid total={1} userAnswers={[null]} keyAnswers={['A']} flaggedQuestions={[]} isCorrected={false} filterMode="all" activeQuestionIndex={null} onSetActiveQuestion={vi.fn()} onOpenQuestion={open} onSelectAnswer={answer} onToggleFlag={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Questão 01, alternativa A' })); expect(answer).toHaveBeenCalledWith(0, 'A'); expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver enunciado da questão 01' })); expect(open).toHaveBeenCalledWith(0);
  });
  it('permite consultar enunciados de uma prova corrigida e bloqueada', () => {
    const open = vi.fn();
    render(<QuestionGrid total={1} userAnswers={['B']} keyAnswers={['A']} flaggedQuestions={[]} isCorrected isLocked filterMode="all" activeQuestionIndex={null} onSetActiveQuestion={vi.fn()} onOpenQuestion={open} onSelectAnswer={vi.fn()} onToggleFlag={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: 'Ver enunciado da questão 01' })); expect(open).toHaveBeenCalledWith(0);
    expect(screen.getByRole('button', { name: 'Questão 01, alternativa A' }).hasAttribute('disabled')).toBe(true);
  });
});
