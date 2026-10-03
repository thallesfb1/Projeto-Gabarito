// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {Sidebar} from './Sidebar';
import {createNewSimulado} from '../utils/provasManager';
const proofs=['Banco do Brasil','Petrobras'].map((name,index)=>({...createNewSimulado(name,2),id:`p${index}`}));
function mount(){const callbacks={onReorderProva:vi.fn(),onSelectProva:vi.fn(),onToggleOpen:vi.fn(),onCloseMobile:vi.fn(),onOpenNewProvaModal:vi.fn(),onOpenRenameModal:vi.fn(),onDuplicateProva:vi.fn(),onDeleteProva:vi.fn(),onOpenBackupModal:vi.fn()};const result=render(<Sidebar {...callbacks} provas={proofs} activeId="p0" isOpen isMobileOpen/>);const cards=Array.from(result.container.querySelectorAll<HTMLElement>('.proof-list'))[0].querySelectorAll<HTMLElement>('[data-proof-id]');cards.forEach((card,index)=>{card.getBoundingClientRect=()=>({top:index*160,bottom:index*160+140,height:140,left:0,right:250,width:250,x:0,y:index*160,toJSON(){}});});return{...callbacks,cards};}
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());vi.stubGlobal('PointerEvent',class extends MouseEvent {pointerType:string;constructor(type:string,options:any={}){super(type,options);this.pointerType=options.pointerType||'mouse';}});});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
describe('reorganização da lateral',()=>{
  it('arrasta a prova com o mouse e não abre o cartão ao soltá-lo',()=>{
    const ui=mount();fireEvent.pointerDown(ui.cards[0],{clientY:70,button:0,pointerType:'mouse'});fireEvent.pointerMove(window,{clientY:230});fireEvent.pointerUp(window);fireEvent.click(ui.cards[0]);
    expect(ui.onReorderProva).toHaveBeenCalledWith('p0','p1');expect(ui.onSelectProva).not.toHaveBeenCalled();
  });
  it('segurar no celular permite mover; um gesto de rolagem antes disso não reorganiza',()=>{
    const ui=mount();fireEvent.touchStart(ui.cards[0],{touches:[{clientY:70}]});act(()=>vi.advanceTimersByTime(450));fireEvent.touchMove(window,{touches:[{clientY:230}]});fireEvent.touchEnd(window);expect(ui.onReorderProva).toHaveBeenCalledWith('p0','p1');
    ui.onReorderProva.mockClear();fireEvent.touchStart(ui.cards[0],{touches:[{clientY:70}]});fireEvent.touchMove(window,{touches:[{clientY:100}]});act(()=>vi.advanceTimersByTime(500));fireEvent.touchEnd(window);expect(ui.onReorderProva).not.toHaveBeenCalled();
  });
  it('permite ordenar pelas setas, mantém um toque para abrir e remove os temas duplicados',()=>{
    const ui=mount();fireEvent.click(ui.cards[0]);expect(ui.onSelectProva).toHaveBeenCalledWith('p0');fireEvent.keyDown(screen.getAllByRole('button',{name:'Mover Banco do Brasil'})[0],{key:'ArrowDown'});expect(ui.onReorderProva).toHaveBeenCalledWith('p0','p1');expect(screen.queryByText('Tema Visual')).toBeNull();
  });
});
