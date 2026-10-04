// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AccountBar } from './AccountBar';
import type { useWorkspace } from '../hooks/useWorkspace';

afterEach(cleanup);
const props={ onBackup:vi.fn(),theme:'clean' as const,onThemeChange:vi.fn(),onMenu:vi.fn(),onHome:vi.fn(),onAI:vi.fn() };
const workspace:ReturnType<typeof useWorkspace>={ scope:'local',configured:false,cloudStatus:'local',saveStatus:'saved',error:'Não há provas locais para importar. Você também pode restaurar um arquivo de backup.',session:null,isStorageReady:true,store:{version:1,activeId:'',provas:[]},setStore:vi.fn(),signIn:vi.fn(),signOut:vi.fn(),importGuest:vi.fn(),retry:vi.fn(),persistNow:vi.fn() };
describe('avisos da conta',()=>{
  it('fecha o aviso sem executar ações ou apagar o erro e volta a avisar para um erro novo',()=>{
    const {rerender}=render(<AccountBar {...props} workspace={workspace}/>);
    expect(screen.getByRole('alert').textContent).toContain('Não há provas locais');
    fireEvent.click(screen.getByRole('button',{name:'Fechar aviso da conta'}));
    expect(screen.queryByRole('alert')).toBeNull();expect(props.onBackup).not.toHaveBeenCalled();expect(workspace.error).toContain('Não há provas locais');
    rerender(<AccountBar {...props} workspace={{...workspace,error:'Falha na sincronização'}}/>);
    expect(screen.getByRole('alert').textContent).toContain('Falha na sincronização');
  });
});
