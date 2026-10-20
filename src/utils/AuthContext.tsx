import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserStats, ShsLevel } from '../types';
import { 
  getStoredAuthToken, 
  setStoredAuthToken, 
  loadUserStats, 
  saveUserStats,
  isGuestModeActive,
  setGuestModeActive,
  loadGuestStats
} from '../utils/storage';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, pass: string, avatar?: string, shsLevel?: ShsLevel, schoolName?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  exitGuestMode: () => void;
  updateProfile: (data: { username?: string; avatar?: string; shsLevel?: ShsLevel; schoolName?: string }) => Promise<{ success: boolean; message?: string }>;
  syncLocalStatsToServer: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; onUserStatsLoaded?: (stats: UserStats) => void }> = ({
  children,
  onUserStatsLoaded,
}) => {
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => isGuestModeActive());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch /api/auth/me on mount or token change
  const refreshUser = async () => {
    const activeToken = getStoredAuthToken();
    if (!activeToken) {
      setUser(null);
      if (isGuestModeActive()) {
        setIsGuest(true);
        if (onUserStatsLoaded) onUserStatsLoaded(loadGuestStats());
      } else {
        setIsGuest(false);
      }
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setGuestModeActive(false);
          setIsGuest(false);
          setUser(data.user);
          // Sync server stats into localStorage for seamless client operation
          if (data.user.stats) {
            saveUserStats(data.user.stats);
            if (onUserStatsLoaded) onUserStatsLoaded(data.user.stats);
          }
        } else {
          setStoredAuthToken(null);
          setToken(null);
          setUser(null);
        }
      } else {
        setStoredAuthToken(null);
        setToken(null);
        setUser(null);
      }
    } catch {
      // In case of network offline, keep cached local user stats
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const continueAsGuest = () => {
    setGuestModeActive(true);
    setIsGuest(true);
    const guestStats = loadGuestStats();
    if (onUserStatsLoaded) onUserStatsLoaded(guestStats);
  };

  const exitGuestMode = () => {
    setGuestModeActive(false);
    setIsGuest(false);
  };

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass }),
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        setGuestModeActive(false);
        setIsGuest(false);
        setStoredAuthToken(data.token);
        setToken(data.token);
        setUser(data.user);
        if (data.user.stats) {
          saveUserStats(data.user.stats);
          if (onUserStatsLoaded) onUserStatsLoaded(data.user.stats);
        }
        return { success: true };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch {
      return { success: false, message: 'Network error connecting to login server' };
    }
  };

  const register = async (username: string, email: string, pass: string, avatar: string = 'avatar_1', shsLevel: ShsLevel = 'SHS 2', schoolName: string = '') => {
    try {
      setGuestModeActive(false);
      setIsGuest(false);
      // Backward compatibility: pass existing local stats as initial stats to preserve progress
      const localStats = loadUserStats();

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password: pass,
          avatar,
          shsLevel,
          schoolName,
          initialStats: {
            ...localStats,
            shsLevel,
            schoolName,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.token && data.user) {
        setGuestModeActive(false);
        setIsGuest(false);
        setStoredAuthToken(data.token);
        setToken(data.token);
        setUser(data.user);
        if (data.user.stats) {
          saveUserStats(data.user.stats);
          if (onUserStatsLoaded) onUserStatsLoaded(data.user.stats);
        }
        return { success: true };
      }
      return { success: false, message: data.message || 'Account creation failed' };
    } catch {
      return { success: false, message: 'Network error connecting to server' };
    }
  };

  const logout = async () => {
    setGuestModeActive(false);
    setIsGuest(false);
    const activeToken = getStoredAuthToken();
    if (activeToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
        });
      } catch {}
    }
    setStoredAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { username?: string; avatar?: string; shsLevel?: ShsLevel; schoolName?: string }) => {
    const activeToken = getStoredAuthToken();
    if (!activeToken) {
      // Offline / guest update
      const localStats = loadUserStats();
      if (data.username) localStats.username = data.username;
      if (data.avatar) localStats.avatar = data.avatar;
      if (data.shsLevel) localStats.shsLevel = data.shsLevel;
      if (data.schoolName) localStats.schoolName = data.schoolName;
      saveUserStats(localStats);
      if (onUserStatsLoaded) onUserStatsLoaded(localStats);
      return { success: true };
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.success && resData.user) {
        setUser(resData.user);
        if (resData.user.stats) {
          saveUserStats(resData.user.stats);
          if (onUserStatsLoaded) onUserStatsLoaded(resData.user.stats);
        }
        return { success: true };
      }
      return { success: false, message: resData.message || 'Failed to update profile' };
    } catch {
      return { success: false, message: 'Network error updating profile' };
    }
  };

  const syncLocalStatsToServer = async () => {
    const activeToken = getStoredAuthToken();
    if (!activeToken) return;
    const stats = loadUserStats();
    try {
      await fetch('/api/quiz/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          clientStats: stats,
          todayStr: new Date().toISOString().split('T')[0],
        }),
      });
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isGuest,
        isLoading,
        login,
        register,
        logout,
        continueAsGuest,
        exitGuestMode,
        updateProfile,
        syncLocalStatsToServer,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
