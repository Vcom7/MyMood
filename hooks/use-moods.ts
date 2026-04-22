import { useState, useEffect } from 'react';
import { auth, db, isConfigured } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query } from 'firebase/firestore';

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  emoji: string;
  note: string;
  energy: string;
  word: string;
  timestamp: number;
}

export function useMoods() {
  const [moods, setMoods] = useState<Record<string, MoodEntry>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isCloud, setIsCloud] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set up auth state
  useEffect(() => {
    if (!auth) {
      // Firebase not configured, just proceed locally
      setIsLoaded(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsCloud(!!currentUser);
      
      if (currentUser && db) {
        try {
          // Load from cloud
          const cloudMoods: Record<string, MoodEntry> = {};
          const q = query(collection(db, `users/${currentUser.uid}/moods`));
          const snapshot = await getDocs(q);
          
          snapshot.forEach((doc) => {
            cloudMoods[doc.id] = doc.data() as MoodEntry;
          });

          // Fetch local storage
          const stored = localStorage.getItem('mymood_data');
          let localMoods: Record<string, MoodEntry> = {};
          if (stored) {
            try {
              localMoods = JSON.parse(stored);
            } catch (e) {
              console.error('Error parsing local moods');
            }
          }

          // Merge local into cloud (migrating local data to firestore)
          // For every local mood not in cloud (or older), save to cloud
          const merged = { ...cloudMoods };
          let needsSync = false;
          
          for (const [date, localEntry] of Object.entries(localMoods)) {
            const cloudEntry = cloudMoods[date];
            if (!cloudEntry || localEntry.timestamp > cloudEntry.timestamp) {
              merged[date] = localEntry;
              needsSync = true;
              // Push to Firestore
              await setDoc(doc(db, `users/${currentUser.uid}/moods`, date), localEntry);
            }
          }
          
          if (needsSync) {
            // Clear local storage after successful migration to prevent duplicates
            localStorage.removeItem('mymood_data');
          }
          
          setMoods(merged);
          setError(null);
        } catch (e) {
          console.error("Error syncing with Firebase:", e);
          setError("Error conectando a la nube. Funcionando en local temporalmente.");
          // Fallback to local if cloud fails
          loadLocal();
        }
      } else {
        // Logged out or Firebase missing, use local
        loadLocal();
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const loadLocal = () => {
    const stored = localStorage.getItem('mymood_data');
    if (stored) {
      try {
        setMoods(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing moods from localStorage', e);
      }
    }
  };

  // Sync to local if NOT logged in
  useEffect(() => {
    if (isLoaded && !isCloud) {
      localStorage.setItem('mymood_data', JSON.stringify(moods));
    }
  }, [moods, isLoaded, isCloud]);

  const saveEntry = async (entry: MoodEntry) => {
    // Optimistic UI update
    setMoods((prev) => ({
      ...prev,
      [entry.date]: entry,
    }));

    if (isCloud && user && db) {
      try {
        await setDoc(doc(db, `users/${user.uid}/moods`, entry.date), entry);
        setError(null);
      } catch (e) {
        console.error("Error saving to Firebase:", e);
        setError("Error guardando en la nube. Se ha guardado en local.");
        setIsCloud(false); // Fallback to local
        localStorage.setItem('mymood_data', JSON.stringify({
          ...moods,
          [entry.date]: entry,
        }));
      }
    }
  };

  const getEntry = (date: string) => {
    return moods[date] || null;
  };

  return {
    moods,
    saveEntry,
    getEntry,
    isLoaded,
    user,
    isCloud,
    error,
    isConfigured
  };
}
