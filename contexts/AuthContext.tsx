import React, { createContext, useContext, useEffect, useState } from 'react';
// Fix: Import auth functions and firestore functions from the local mock implementation
import { auth, db, onAuthStateChanged, getAuth, doc, getDoc } from '../firebase';
import { UserRole, Status, UserProfile } from '../types';

interface AuthContextType {
  currentUser: any;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string, email: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      
      if (docSnap.exists()) {
        setUserProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        // Fallback profile if user exists in auth but not in Firestore mock (prevents white screen)
        setUserProfile({
          id: uid,
          full_name: email.split('@')[0],
          email: email,
          role: UserRole.ADMIN,
          status: Status.ACTIVE,
          created_at: new Date()
        });
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  useEffect(() => {
    // Monitor Auth State
    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user.uid, user.email || '');
      } else {
        setUserProfile(null);
      }
      // Delay slightly to prevent flicker and ensure profile is loaded if user exists
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser.uid, currentUser.email || '');
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};