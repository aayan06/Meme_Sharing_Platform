
"use client";

import { createContext, useState, useEffect, useContext, ReactNode, Dispatch, SetStateAction } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: any | null;
  setUserData: Dispatch<SetStateAction<any | null>>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true, 
    userData: null,
    setUserData: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <Skeleton className="w-64 h-8 mb-4" />
            <Skeleton className="w-full max-w-md h-96" />
        </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, userData, setUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
