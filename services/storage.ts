import { storage, db } from './firebase';
import { User, DocFile, FileVersion } from '../types';

// Local Storage Keys (Used strictly for caching/offline fallback)
const getLocalProfileKey = (userId: string) => `synapsesyncdb_profile_${userId}`;
const getLocalFilesKey = (userId: string) => `synapse_documents_${userId}`;

const TIMEOUT_MS = 15000; 

// Helper to prevent hanging requests
const withTimeout = <T>(promise: Promise<T>, ms: number = TIMEOUT_MS): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('storage/timeout')), ms);
        promise
            .then(res => { clearTimeout(timer); resolve(res); })
            .catch(err => { clearTimeout(timer); reject(err); });
    });
};

export const resetFallbackMode = () => {
    // No-op: We always try cloud first now.
};

export const StorageService = {
  
  // --- User Profile (Cloud First) ---

  async saveUserProfile(user: User): Promise<void> {
    // 1. Optimistic Cache Update
    try {
      localStorage.setItem(getLocalProfileKey(user.id), JSON.stringify(user));
    } catch (e) { console.warn("Cache update failed", e); }

    if (!navigator.onLine) return;

    try {
      // 2. Source of Truth Update (Firestore)
      await db.collection('users').doc(user.id).set(user, { merge: true });
    } catch (error: any) {
      console.error("Firestore Save Error:", error);
      // We don't throw here to allow the app to continue working "offline"
    }
  },

  async getUserProfile(userId: string): Promise<User | null> {
    // 1. Try Cloud First
    if (navigator.onLine) {
        try {
            const doc = await withTimeout(db.collection('users').doc(userId).get()) as any;
            if (doc.exists) {
                const cloudData = doc.data() as User;
                // Ensure ID is set correctly
                cloudData.id = userId;
                // Update Cache
                localStorage.setItem(getLocalProfileKey(userId), JSON.stringify(cloudData));
                return cloudData;
            } else {
                // User exists in Auth but not DB yet (First login)
                return null;
            }
        } catch (error) {
            console.warn("Cloud profile fetch failed, falling back to cache:", error);
        }
    }

    // 2. Fallback to Local Cache
    try {
      const local = localStorage.getItem(getLocalProfileKey(userId));
      if (local) return JSON.parse(local);
    } catch (e) { console.warn(e); }

    return null;
  },

  // --- Document Management (Cloud First) ---
  // Design: 
  // - Firestore: Stores Metadata + Version Summaries (Lightweight)
  // - Storage: Stores Full Content + Full Version Content (Heavy)

  async uploadFile(userId: string, file: DocFile): Promise<void> {
    // 1. Optimistic Cache Update (Immediate UI feedback support)
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

    try {
      // 2. Upload Heavy Content to Firebase Storage (The Blob)
      const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
      const storageRef = storage.ref(`documents/${userId}/${file.id}.json`);
      
      // Upload with metadata
      await storageRef.put(blob, { contentType: 'application/json' });

      // 3. Update Firestore Metadata
      // We strip the 'content' from versions to keep Firestore document size small/fast
      const versionMetadata = file.versions.map(v => ({
        id: v.id,
        timestamp: v.timestamp,
        versionLabel: v.versionLabel,
        // Intentionally omitting 'content' to save DB bandwidth
      }));

      // Destructure to separate heavy content from metadata
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { currentContent, versions, ...metadata } = file;
      
      // Save metadata to Firestore
      await db.collection('users').doc(userId).collection('files').doc(file.id).set({
        ...metadata,
        versionHistory: versionMetadata, // Save history summary
        lastSynced: new Date().toISOString()
      }, { merge: true });

    } catch (error: any) {
       console.error("Upload Sync Error:", error);
       throw error; 
    }
  },

  async deleteFile(userId: string, fileId: string): Promise<void> {
    // 1. Optimistic Local Delete
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
      // 2. Delete from Cloud
      const storageRef = storage.ref(`documents/${userId}/${fileId}.json`);
      // Delete blob (catch error if it doesn't exist to prevent blocking)
      await storageRef.delete().catch(e => console.warn("Storage delete ignored", e.code));

      // Delete metadata
      await db.collection('users').doc(userId).collection('files').doc(fileId).delete();
    } catch (error: any) {
      console.error("Delete Sync Error:", error);
    }
  },

  async getUserFiles(userId: string): Promise<DocFile[]> {
    // 1. Try Cloud First
    if (navigator.onLine) {
        try {
            const snapshot = await withTimeout(
                db.collection('users').doc(userId).collection('files').orderBy('lastUpdated', 'desc').get()
            ) as any;

            if (!snapshot.empty) {
                const cloudFiles = snapshot.docs.map((doc: any) => {
                    const data = doc.data();
                    
                    // Reconstruct version summary so UI shows correct badge count
                    const reconstructedVersions: FileVersion[] = data.versionHistory 
                        ? data.versionHistory.map((v: any) => ({ 
                            id: v.id, 
                            timestamp: v.timestamp, 
                            versionLabel: v.versionLabel, 
                            content: '' // Empty content for list view (Performance)
                          })) 
                        : [];

                    return {
                        ...data,
                        id: doc.id,
                        currentContent: '', // Empty content (fetched on demand)
                        versions: reconstructedVersions,
                        _isLite: true // UI knows to fetch full file on click
                    } as DocFile;
                });

                // Update Local Cache with fresh Cloud data
                localStorage.setItem(getLocalFilesKey(userId), JSON.stringify(cloudFiles));
                return cloudFiles;
            } else {
                // Cloud is empty, return empty array (and clear cache if needed)
                return [];
            }
        } catch (error) {
            console.warn("Cloud fetch failed, falling back to cache", error);
        }
    }

    // 2. Fallback to Local Cache
    try {
      const local = localStorage.getItem(getLocalFilesKey(userId));
      if (local) return JSON.parse(local);
    } catch (e) { console.warn(e); }

    return [];
  },

  async loadFullFile(userId: string, fileId: string): Promise<DocFile | null> {
    // 1. Try Cloud First
    if (navigator.onLine) {
        try {
            const ref = storage.ref(`documents/${userId}/${fileId}.json`);
            const url = await ref.getDownloadURL();
            const response = await fetch(url); // Standard fetch to get JSON content
            
            if (!response.ok) throw new Error('File fetch failed');
            
            const fullFile = await response.json() as DocFile;
            
            // Note: We do NOT overwrite the entire list cache here, 
            // as that might be expensive. We return the fresh file.
            return fullFile;
        } catch (error) {
            console.error("Full file load error (Cloud):", error);
        }
    }

    // 2. Fallback to Local Cache
    try {
        const localFilesKey = getLocalFilesKey(userId);
        const currentLocal = localStorage.getItem(localFilesKey);
        if (currentLocal) {
            const filesArray: DocFile[] = JSON.parse(currentLocal);
            const found = filesArray.find(f => f.id === fileId);
            // Only return if it's not a "Lite" version (has content)
            if (found && !found._isLite) return found;
        }
    } catch(e) {}

    return null;
  }
};