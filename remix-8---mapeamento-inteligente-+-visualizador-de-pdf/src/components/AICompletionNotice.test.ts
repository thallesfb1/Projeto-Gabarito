// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
const sound=vi.hoisted(()=>vi.fn());
vi.mock('../utils/readingSound',()=>({playReadingSound:sound}));
import { notifyCompletedReading } from './AICompletionNotice';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();sound.mockClear();document.body.innerHTML='';});
describe('aviso externo de leitura',()=>{
  it('toca fora da leitura acompanhada, inclusive em outra aba, e fica silencioso enquanto ela está aberta',async()=>{
    vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
    document.body.innerHTML='<div data-reading-active="true" data-reading-id="job1"></div>';
    await notifyCompletedReading('job1');expect(sound).not.toHaveBeenCalled();
    await notifyCompletedReading('job2');expect(sound).toHaveBeenCalledTimes(1);
    vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');
    await notifyCompletedReading('job1');expect(sound).toHaveBeenCalledTimes(2);
    document.body.innerHTML='';vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
    await notifyCompletedReading('job1');expect(sound).toHaveBeenCalledTimes(3);
  });
  it('avisa somente em outra aba com permissão e não expõe o conteúdo do arquivo',()=>{
    const notify=vi.fn(function(){});Object.assign(notify,{permission:'granted'});vi.stubGlobal('Notification',notify);
    vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');notifyCompletedReading();expect(notify).not.toHaveBeenCalled();
    vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');notifyCompletedReading();expect(notify).toHaveBeenCalledTimes(1);expect(notify).toHaveBeenCalledWith('Leitura concluída!',expect.objectContaining({tag:'ai-reading-complete'}));
    Object.assign(notify,{permission:'denied'});notifyCompletedReading();expect(notify).toHaveBeenCalledTimes(1);
  });
  it('preserva o resultado quando o dispositivo não suporta a notificação externa',()=>{
    const notify=vi.fn(function(){throw new Error('Unsupported');});Object.assign(notify,{permission:'granted'});vi.stubGlobal('Notification',notify);
    vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');expect(()=>notifyCompletedReading()).not.toThrow();
  });
});
