import { storage, db } from './firebase';
import { User, DocFile, FileVersion } from '../types';

// Local Storage Keys (Used strictly for caching/offline fallback)
const getLocalProfileKey = (userId: string) => `synapsesyncdb_profile_${userId}`;
const getLocalFilesKey = (userId: string) => `synapse_documents_${userId}`;

const UPLOAD_TIMEOUT_MS = 30000; // Increased to 30s for reliability

export const resetFallbackMode = () => {
    // No-op
};

export const StorageService = {
  
  // --- User Profile (Cloud First) ---

  async saveUserProfile(user: User): Promise<void> {
    try {
      localStorage.setItem(getLocalProfileKey(user.id), JSON.stringify(user));
    } catch (e) { console.warn("Cache update failed", e); }

    if (!navigator.onLine) return;

    try {
      await db.collection('users').doc(user.id).set(user, { merge: true });
    } catch (error: any) {
      console.error("Firestore Save Error:", error);
    }
  },

  async getUserProfile(userId: string): Promise<User | null> {
    if (navigator.onLine) {
        try {
            const doc = await db.collection('users').doc(userId).get() as any;
            if (doc.exists) {
                const cloudData = doc.data() as User;
                cloudData.id = userId;
                localStorage.setItem(getLocalProfileKey(userId), JSON.stringify(cloudData));
                return cloudData;
            } else {
                return null;
            }
        } catch (error) {
            console.warn("Cloud profile fetch failed, falling back to cache:", error);
        }
    }

    try {
      const local = localStorage.getItem(getLocalProfileKey(userId));
      if (local) return JSON.parse(local);
    } catch (e) { console.warn(e); }

    return null;
  },

  // --- Document Management (Cloud First) ---

  async uploadFile(userId: string, file: DocFile): Promise<void> {
    // 1. Optimistic Cache Update
    try {
      const localFilesKey = getLocalFilesKey(userId);
      const currentLocal = localStorage.getItem(localFilesKey);
      let filesArray: DocFile[] = currentLocal ? JSON.parse(currentLocal) : [];
      const idx = filesArray.findIndex(f => f.id === file.id);
      if (idx >= 0) filesArray[idx] = file;
      else filesArray.push(file);
      localStorage.setItem(localFilesKey, JSON.stringify(filesArray));
    } catch (e) { console.error(e); }

    if (!navigator.onLine) throw new Error("Offline: Saved locally, will sync later.");

    let storageError = null;

    // 2. Upload to Cloud Storage (Attempt, but don't block Firestore save on failure)
    try {
      console.log(`Starting upload for file: ${file.title} (${file.id})`);
      
      const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
      const storageRef = storage.ref(`documents/${userId}/${file.id}.json`);
      
      const uploadTask = storageRef.put(blob, { contentType: 'application/json' });
      
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            try { uploadTask.cancel(); } catch(e) {}
            reject(new Error("Storage upload timed out"));
        }, UPLOAD_TIMEOUT_MS);

        uploadTask.then((snapshot) => {
            clearTimeout(timer);
            resolve(snapshot);
        }).catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
      });

      console.log("Storage upload successful.");
    } catch (error: any) {
      console.warn("Storage upload failed (continuing to Firestore):", error);
      storageError = error;
    }

    // 3. Update Firestore Metadata AND Content (Redundancy Fix)
    // We proceed here even if storage failed, ensuring the data is saved somewhere cloud-accessible.
    try {
      const safeVersions = file.versions || [];
      const versionMetadata = safeVersions.map(v => ({
        id: v.id,
        timestamp: v.timestamp,
        versionLabel: v.versionLabel,
      }));

      // Extract metadata but KEEP currentContent for Firestore backup
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { versions, _isLite, ...metadata } = file as any;
      
      const firestorePromise = db.collection('users').doc(userId).collection('files').doc(file.id).set({
        ...metadata,
        versionHistory: versionMetadata, 
        lastSynced: new Date().toISOString()
      }, { merge: true });

      await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Firestore metadata write timed out")), 15000);
          firestorePromise.then(res => { clearTimeout(timer); resolve(res); })
                          .catch(err => { clearTimeout(timer); reject(err); });
      });
      
      console.log("Firestore metadata update successful.");

    } catch (firestoreError: any) {
       console.error("Firestore Update Error:", firestoreError);
       // If BOTH failed, throw the error
       if (storageError) {
         throw new Error(`Sync failed: Storage (${storageError.message}) & Firestore (${firestoreError.message})`);
       }
       // If only Firestore failed but Storage worked (unlikely but possible), throw to be safe.
       throw firestoreError;
    }
  },

  async deleteFile(userId: string, fileId: string): Promise<void> {
    try {
      const localFilesKey = getLocalFilesKey(userId);
      const currentLocal = localStorage.getItem(localFilesKey);
      if (currentLocal) {
        let filesArray: DocFile[] = JSON.parse(currentLocal);
        filesArray = filesArray.filter(f => f.id !== fileId);
        localStorage.setItem(localFilesKey, JSON.stringify(filesArray));
      }
    } catch (e) { console.error(e); }

    if (!navigator.onLine) return;

    try {
      const storageRef = storage.ref(`documents/${userId}/${fileId}.json`);
      await storageRef.delete().catch(e => console.warn("Storage delete ignored", e.code));
      await db.collection('users').doc(userId).collection('files').doc(fileId).delete();
    } catch (error: any) {
      console.error("Delete Sync Error:", error);
    }
  },

  async getUserFiles(userId: string): Promise<DocFile[]> {
    if (navigator.onLine) {
        try {
            console.log(`Fetching files for user: ${userId}`);
            const snapshot = await db.collection('users').doc(userId).collection('files').get() as any;

            console.log(`Found ${snapshot.empty ? 0 : snapshot.docs.length} files in cloud.`);

            if (!snapshot.empty) {
                const cloudFiles = snapshot.docs.map((doc: any) => {
                    const data = doc.data();
                    
                    const reconstructedVersions: FileVersion[] = data.versionHistory 
                        ? data.versionHistory.map((v: any) => ({ 
                            id: v.id, 
                            timestamp: v.timestamp, 
                            versionLabel: v.versionLabel, 
                            content: '' 
                          })) 
                        : [];

                    return {
                        ...data,
                        id: doc.id,
                        // IMPORTANT: Force content empty for list view
                        currentContent: '', 
                        versions: reconstructedVersions,
                        _isLite: true 
                    } as DocFile;
                });

                cloudFiles.sort((a: DocFile, b: DocFile) => {
                    const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
                    const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
                    return dateB - dateA;
                });

                localStorage.setItem(getLocalFilesKey(userId), JSON.stringify(cloudFiles));
                return cloudFiles;
            } else {
                return [];
            }
        } catch (error) {
            console.error("Cloud fetch failed (getUserFiles):", error);
        }
    }

    try {
      console.log("Falling back to local cache for files.");
      const local = localStorage.getItem(getLocalFilesKey(userId));
      if (local) return JSON.parse(local);
    } catch (e) { console.warn(e); }

    return [];
  },

  async loadFullFile(userId: string, fileId: string): Promise<DocFile | null> {
    if (navigator.onLine) {
        // STRATEGY 1: Try Cloud Storage (Best for full history)
        try {
            const ref = storage.ref(`documents/${userId}/${fileId}.json`);
            const url = await ref.getDownloadURL();
            const response = await fetch(url);
            
            if (!response.ok) throw new Error(`Storage fetch failed: ${response.statusText}`);
            
            const fullFile = await response.json() as DocFile;
            return fullFile;
        } catch (error) {
            // Log as info to avoid confusing the user with red errors, as this is an expected fallback path if CORS is unconfigured.
            console.log("Direct Storage load failed (likely CORS or network), switching to Firestore backup.");

            // STRATEGY 2: Firestore Fallback (Fixes 'Failed to fetch' / CORS issues)
            try {
                const doc = await db.collection('users').doc(userId).collection('files').doc(fileId).get();
                if (doc.exists) {
                    const data = doc.data();
                    // Use the content saved in Firestore if available
                    // Check for undefined or null, but allow empty string if it's a valid empty doc
                    if (data && typeof data.currentContent === 'string') {
                         const reconstructedVersions = (data.versionHistory || []).map((v: any) => ({
                             id: v.id,
                             timestamp: v.timestamp,
                             versionLabel: v.versionLabel,
                             content: '' // History content not available in fallback
                         }));

                         return {
                             ...data,
                             id: doc.id,
                             currentContent: data.currentContent,
                             versions: reconstructedVersions,
                             _isLite: false
                         } as DocFile;
                    }
                }
            } catch (fsError) {
                console.error("Firestore fallback failed:", fsError);
            }
        }
    }

    // STRATEGY 3: Local Cache
    try {
        const localFilesKey = getLocalFilesKey(userId);
        const currentLocal = localStorage.getItem(localFilesKey);
        if (currentLocal) {
            const filesArray: DocFile[] = JSON.parse(currentLocal);
            const found = filesArray.find(f => f.id === fileId);
            if (found && !found._isLite) return found;
        }
    } catch(e) {}

    return null;
  }
};