import { create } from 'zustand';
import type { SaveStatus, CaseManifest } from '../types';

interface FileStoreState {
  handle: FileSystemFileHandle | null;
  filename: string;
  saveStatus: SaveStatus;
  lastSaved: string | null;
  manifest: CaseManifest | null;
  setHandle: (handle: FileSystemFileHandle | null, filename: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLastSaved: (ts: string) => void;
  setManifest: (manifest: CaseManifest) => void;
  reset: () => void;
}

export const useFileStore = create<FileStoreState>((set) => ({
  handle: null,
  filename: '',
  saveStatus: 'saved',
  lastSaved: null,
  manifest: null,

  setHandle: (handle, filename) => set({ handle, filename }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setLastSaved: (lastSaved) => set({ lastSaved }),
  setManifest: (manifest) => set({ manifest }),
  reset: () => set({ handle: null, filename: '', saveStatus: 'saved', lastSaved: null, manifest: null }),
}));
