export async function saveFileToIndexedDB(key: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("UploadDrafts", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      store.put(file, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getFileFromIndexedDB(key: string): Promise<File | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("UploadDrafts", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFileFromIndexedDB(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("UploadDrafts", 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}