import { describe, expect, it } from 'vitest';
import { validateJobInput, locksProof, type AIReadingJob } from './aiJobs';
const owner = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const input = { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', proof_id: 'proof1', mode: 'exam', target_snapshot: null,
  source: { ownerId: owner, path: `${owner}/proof1/cccccccc-cccc-cccc-cccc-cccccccccccc.pdf`, name: 'prova.pdf', mime: 'application/pdf', size: 20, kind: 'exam' } };
describe('destinos privados das leituras', () => {
  it('recusa arquivo de outra conta, caminho de outra prova e imagem como prova', () => {
    expect(validateJobInput(input, owner).proof_id).toBe('proof1');
    expect(() => validateJobInput(input, 'dddddddd-dddd-dddd-dddd-dddddddddddd')).toThrow();
    expect(() => validateJobInput({ ...input, proof_id: 'proof2' }, owner)).toThrow();
    expect(() => validateJobInput({ ...input, source: { ...input.source, mime: 'image/png' } }, owner)).toThrow();
    expect(() => validateJobInput({ ...input, target_snapshot: { id: 'proof2', title: 'Outra prova' } }, owner)).toThrow();
  });
  it('protege apenas o destino até a conferência e libera após falha ou cancelamento', () => {
    const job = { ...input, target_snapshot: { id: 'proof1' }, status: 'running' } as AIReadingJob;
    expect(locksProof(job, 'proof1')).toBe(true);
    expect(locksProof(job, 'proof2')).toBe(false);
    expect(locksProof({ ...job, status: 'ready' }, 'proof1')).toBe(true);
    expect(locksProof({ ...job, status: 'failed' }, 'proof1')).toBe(false);
    expect(locksProof({ ...job, status: 'cancelled' }, 'proof1')).toBe(false);
    expect(locksProof({ ...job, target_snapshot: null }, 'proof1')).toBe(false);
  });
});
