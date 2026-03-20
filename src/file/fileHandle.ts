export const hasFileSystemAccess = (): boolean =>
  typeof window !== 'undefined' && 'showOpenFilePicker' in window;

// ── IndexedDB persistence for FileSystemFileHandle ──────────────────────────

const IDB_NAME = 'tracenote-v1';
const IDB_STORE = 'handles';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandleToIDB(handle: FileSystemFileHandle): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, 'lastHandle');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHandleFromIDB(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('lastHandle');
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearHandleFromIDB(): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete('lastHandle');
      tx.oncomplete = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function openTnoteFile(): Promise<{ handle: FileSystemFileHandle | null; file: File }> {
  if (hasFileSystemAccess()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{ description: 'TraceNote Case', accept: { 'application/zip': ['.tnote'] } }],
      multiple: false,
    });
    const file = await handle.getFile();
    return { handle, file };
  } else {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.tnote';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { reject(new Error('No file selected')); return; }
        resolve({ handle: null, file });
      };
      input.click();
    });
  }
}

export async function createTnoteFile(title: string): Promise<{ handle: FileSystemFileHandle | null; filename: string }> {
  const filename = `${title.replace(/[^a-z0-9]/gi, '_')}.tnote`;
  if (hasFileSystemAccess()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: 'TraceNote Case', accept: { 'application/zip': ['.tnote'] } }],
    });
    return { handle, filename: handle.name };
  }
  return { handle: null, filename };
}

export async function writeTnoteFile(handle: FileSystemFileHandle, data: Blob): Promise<void> {
  // queryPermission/requestPermission are part of the File System Access API
  // but not yet in all TypeScript DOM lib versions; cast to access them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = handle as any;
  if (typeof h.queryPermission === 'function') {
    const perm = await h.queryPermission({ mode: 'readwrite' }) as string;
    if (perm !== 'granted') {
      const req = await h.requestPermission({ mode: 'readwrite' }) as string;
      if (req !== 'granted') throw new Error('Write permission denied');
    }
  }
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
