import { EMPTY_STATE, validateState } from './nutrition.mjs';
const STORAGE_KEY = 'nutra_browser_state';
let connection;

function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('O navegador não disponibiliza armazenamento. Use uma janela normal com armazenamento habilitado.'));
    const request = indexedDB.open('nutra-diary', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível abrir o histórico deste navegador.'));
    request.onblocked = () => reject(new Error('Feche outras abas do Nutra e tente novamente.'));
  });
  return connection;
}

export async function readBrowserState() {
  // 1. Try IndexedDB
  try {
    const db = await database();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readonly');
      const req = tx.objectStore('records').get('state');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (result) {
      const valid = validateState(result);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(valid)); } catch {}
      return valid;
    }
  } catch (err) {
    // IndexedDB failed or empty, fallback to localStorage
  }

  // 2. Fallback to localStorage (especially important on mobile Safari / WebKit PWA)
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return validateState(JSON.parse(local));
    }
  } catch (err) {}

  return structuredClone(EMPTY_STATE);
}

export async function writeBrowserState(input) {
  const state = validateState(input);

  // Synchronously backup to localStorage first for instant durability
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {}

  // Save to IndexedDB
  try {
    const db = await database();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('records', 'readwrite');
      const store = transaction.objectStore('records');
      const previous = store.get('state');
      previous.onsuccess = () => {
        if (previous.result) store.put(previous.result, 'previous');
        store.put(state, 'state');
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
  } catch (err) {
    // If IndexedDB fails, localStorage is already updated
  }

  return { saved: true };
}
