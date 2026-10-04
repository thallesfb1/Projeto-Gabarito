// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();localStorage.clear();});
describe('preferência do aviso sonoro',()=>{
  it('prepara o áudio no gesto do usuário, toca ao concluir e respeita o desligamento persistido',async()=>{
    localStorage.clear();
    const start=vi.fn(),resume=vi.fn(),create=vi.fn(()=>({frequency:{value:0},connect:vi.fn(),start,stop:vi.fn(),disconnect:vi.fn()}));
    vi.stubGlobal('AudioContext',class {state='suspended';currentTime=0;destination={};resume=async()=>{this.state='running';resume();};createOscillator=create;createGain=()=>({gain:{setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()});});
    const sound=await import('./readingSound');
    sound.playReadingSound();expect(start).not.toHaveBeenCalled();
    await sound.prepareReadingSound();sound.playReadingSound();expect(resume).toHaveBeenCalledOnce();expect(start).toHaveBeenCalledTimes(2);
    sound.setReadingSound(false);sound.playReadingSound();expect(start).toHaveBeenCalledTimes(2);expect(localStorage.getItem('ai-reading-sound')).toBe('off');
    vi.resetModules();expect((await import('./readingSound')).readingSoundEnabled()).toBe(false);
  });
  it('mantém os avisos visuais possíveis quando o navegador não oferece áudio',async()=>{
    vi.stubGlobal('AudioContext',undefined);
    const sound=await import('./readingSound');await expect(sound.prepareReadingSound()).resolves.toBeUndefined();expect(()=>sound.playReadingSound()).not.toThrow();
  });
});
