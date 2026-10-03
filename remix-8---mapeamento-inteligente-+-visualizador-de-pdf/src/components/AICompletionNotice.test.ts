// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyCompletedReading } from './AICompletionNotice';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('aviso externo de leitura',()=>{
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
