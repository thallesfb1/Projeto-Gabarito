import {useEffect,useRef,useState} from 'react';
import type {PointerEvent as ReactPointerEvent,TouchEvent as ReactTouchEvent} from 'react';

export function useProofReorder(onMove:((id:string,target:string)=>void)|undefined,enabled:boolean){
  const [drag,setDrag]=useState<{id:string;target:string}|null>(null);
  const cleanup=useRef<()=>void>(()=>{});
  const suppressUntil=useRef(0);
  const latest=useRef({onMove,enabled});latest.current={onMove,enabled};
  useEffect(()=>{if(!enabled){cleanup.current();setDrag(null);}return()=>cleanup.current();},[enabled]);
  const begin=(id:string,root:HTMLElement,initialY:number,touch:boolean)=>{
    cleanup.current();
    let active=false,target=id,y=initialY,frame=0,hold:ReturnType<typeof setTimeout>|undefined;
    const update=()=>{
      const items=Array.from(root.querySelectorAll<HTMLElement>('[data-proof-id]'));
      if(!items.length)return;
      let nearest=items[0],distance=Infinity;
      for(const item of items){const rect=item.getBoundingClientRect(),delta=Math.abs(y-(rect.top+rect.height/2));if(delta<distance){distance=delta;nearest=item;}}
      const next=nearest.dataset.proofId!;
      if(next!==target){target=next;setDrag({id,target});}
    };
    const scroll=()=>{
      if(!active)return;
      const bounds=root.getBoundingClientRect();
      if(y<bounds.top+44)root.scrollTop-=12;else if(y>bounds.bottom-44)root.scrollTop+=12;
      update();frame=requestAnimationFrame(scroll);
    };
    const start=()=>{if(!latest.current.enabled)return;active=true;suppressUntil.current=Date.now()+600;setDrag({id,target});frame=requestAnimationFrame(scroll);};
    const finish=(commit:boolean)=>{
      if(hold)clearTimeout(hold);cancelAnimationFrame(frame);
      window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',pointerUp);window.removeEventListener('pointercancel',cancel);
      window.removeEventListener('touchmove',touchMove);window.removeEventListener('touchend',touchEnd);window.removeEventListener('touchcancel',cancel);
      cleanup.current=()=>{};setDrag(null);
      if(active){suppressUntil.current=Date.now()+600;if(commit && latest.current.enabled && id!==target)latest.current.onMove?.(id,target);}
    };
    const pointerMove=(event:PointerEvent)=>{y=event.clientY;if(!active && Math.abs(y-initialY)>6)start();if(active){event.preventDefault();update();}};
    const pointerUp=()=>finish(true),cancel=()=>finish(false);
    const touchMove=(event:TouchEvent)=>{
      if(event.touches.length!==1){finish(false);return;}
      y=event.touches[0].clientY;
      if(!active){if(Math.abs(y-initialY)>8)finish(false);return;}
      event.preventDefault();update();
    };
    const touchEnd=()=>finish(true);
    cleanup.current=()=>finish(false);
    if(touch){hold=setTimeout(start,450);window.addEventListener('touchmove',touchMove,{passive:false});window.addEventListener('touchend',touchEnd);window.addEventListener('touchcancel',cancel);}
    else {window.addEventListener('pointermove',pointerMove,{passive:false});window.addEventListener('pointerup',pointerUp);window.addEventListener('pointercancel',cancel);}
  };
  const allowed=(element:HTMLElement)=>!element.closest('button,input,select,a') || Boolean(element.closest('[data-reorder-handle]'));
  const pointerDown=(event:ReactPointerEvent<HTMLElement>,id:string)=>{
    if(!enabled || !onMove || event.pointerType==='touch' || event.button!==0 || !allowed(event.target as HTMLElement))return;
    const root=event.currentTarget.closest<HTMLElement>('.proof-list');if(root)begin(id,root,event.clientY,false);
  };
  const touchStart=(event:ReactTouchEvent<HTMLElement>,id:string)=>{
    if(!enabled || !onMove || event.touches.length!==1 || !allowed(event.target as HTMLElement))return;
    const root=event.currentTarget.closest<HTMLElement>('.proof-list');if(root)begin(id,root,event.touches[0].clientY,true);
  };
  return {drag,pointerDown,touchStart,consumeClick:()=>Date.now()<suppressUntil.current};
}
