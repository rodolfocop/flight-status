'use client';

import { useSyncExternalStore } from 'react';
import { Plane, Sun } from 'lucide-react';

type Layout = 'voo' | 'ferias';
const storageKey = 'destino-certo:layout';
const changeEvent = 'destino-certo:layout-change';
let memoryLayout: Layout = 'voo';

function snapshot(): Layout {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved === 'ferias' || saved === 'voo' ? saved : memoryLayout;
  } catch {
    return memoryLayout;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

export function useLayout() {
  return useSyncExternalStore(subscribe, snapshot, () => 'voo' as Layout);
}

function chooseLayout(layout: Layout) {
  memoryLayout = layout;
  try { window.localStorage.setItem(storageKey, layout); } catch { /* A escolha vale nesta sessão quando o armazenamento não está disponível. */ }
  window.dispatchEvent(new Event(changeEvent));
}

export default function LayoutSwitch() {
  const layout = useLayout();
  return <div className="layout-switch" role="group" aria-label="Escolher visual do aplicativo">
    <span className="layout-switch__label">Visual</span>
    <button type="button" aria-pressed={layout === 'voo'} onClick={() => chooseLayout('voo')}><Plane size={15} aria-hidden="true"/>Voo</button>
    <button type="button" aria-pressed={layout === 'ferias'} onClick={() => chooseLayout('ferias')}><Sun size={15} aria-hidden="true"/>Férias</button>
  </div>;
}
