import { create } from 'zustand';
import type { CaseSettings } from '../types';

export type ProxyStatus = 'unchecked' | 'ok' | 'unreachable';

interface SettingsStoreState extends CaseSettings {
  proxyStatus: ProxyStatus;
  setProxyUrl:    (url: string) => void;
  setProxyStatus: (status: ProxyStatus) => void;
  load:           (settings: CaseSettings) => void;
  reset:          () => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  proxyUrl:    '',
  proxyStatus: 'unchecked',
  setProxyUrl:    (url) => set({ proxyUrl: url.replace(/\/$/, ''), proxyStatus: 'unchecked' }),
  setProxyStatus: (proxyStatus) => set({ proxyStatus }),
  load:           (settings) => set({ ...settings, proxyStatus: 'unchecked' }),
  reset:          () => set({ proxyUrl: '', proxyStatus: 'unchecked' }),
}));
