// Persists the last-used certificate in IndexedDB (localStorage's ~5MB string limit is too small for big images).
const KEY = "certificate";

function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open("certificate-generator", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("files");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = fn(open.result.transaction("files", mode).objectStore("files"));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

export const saveCertificate = (file: File) => withStore("readwrite", (s) => s.put(file, KEY));
export const loadCertificate = () => withStore<File | undefined>("readonly", (s) => s.get(KEY));
