async function imageStore(mode, operation) {
    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('bison-item-images', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('images');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    try {
        return await new Promise((resolve, reject) => {
            const transaction = db.transaction('images', mode);
            const request = operation(transaction.objectStore('images'));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error || new Error('Image storage interrupted.'));
        });
    } finally { db.close(); }
}
export const saveItemImage = (id, file) => imageStore('readwrite', (store) => store.put(file, id));
export const readItemImage = (id) => imageStore('readonly', (store) => store.get(id));
export const deleteItemImage = (id) => imageStore('readwrite', (store) => store.delete(id));
