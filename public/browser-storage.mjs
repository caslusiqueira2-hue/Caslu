import { EMPTY_STATE, validateState } from './nutrition.mjs';
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
  const db = await database();
  return new Promise((resolve,reject) => {
    const request = db.transaction('records','readonly').objectStore('records').get('state');
    request.onsuccess = () => { try { resolve(validateState(request.result || structuredClone(EMPTY_STATE))); } catch { reject(new Error('O histórico deste navegador não pôde ser lido. Restaure uma cópia em Ajustes.')); } };
    request.onerror = () => reject(new Error('Não foi possível ler os dados salvos neste navegador.'));
  });
}
export async function writeBrowserState(input) {
  const state = validateState(input), db = await database();
  return new Promise((resolve,reject) => {
    const transaction = db.transaction('records','readwrite');
    const store = transaction.objectStore('records');
    const previous = store.get('state');
    previous.onsuccess = () => { if(previous.result) store.put(previous.result,'previous'); store.put(state,'state'); };
    transaction.oncomplete = () => resolve({saved:true});
    transaction.onerror = transaction.onabort = () => reject(new Error('O histórico não foi salvo. Confira o espaço disponível e exporte uma cópia.'));
  });
}
