import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { hashPassword } from '@/lib/crypto';

const MemberAuthContext = createContext();

const SESSION_KEY = 'member_session';

export const MemberAuthProvider = ({ children }) => {
  const [member, setMember] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from sessionStorage
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Üyelik süresi dolmuşsa veya dondurulmuşsa oturumu kapat
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(parsed.end_date);
      endDate.setHours(0, 0, 0, 0);
      const isExpired = endDate < today;
      const isInvalid = parsed.status === 'frozen' || parsed.status === 'suspended' || isExpired;
      if (isInvalid || !parsed.status) {
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        setMember(parsed);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    const hashed = await hashPassword(password);
    const response = await base44.functions.invoke('memberLogin', {
      username: username.toLowerCase().trim(),
      password: hashed,
    });

    const data = response?.data ?? response;

    if (data?.error) {
      throw new Error(data.error);
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    setMember(data);
    return data;
  };

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setMember(null);
  }, []);

  // Real-time sync: admin panelde üye verisi değişince oturumu güncelle
  useEffect(() => {
    if (!member?.id) return;

    const unsubscribe = base44.entities.Membership.subscribe((event) => {
      if (event.id !== member.id) return;

      if (event.type === 'delete') {
        logout();
        return;
      }

      if (event.type === 'update' && event.data) {
        const updated = event.data;

        // Askıya alındıysa çıkış yap
        if (updated.status === 'suspended') {
          logout();
          return;
        }

        const newSession = {
          id: updated.id,
          user_name: updated.user_name,
          username: updated.username,
          user_email: updated.user_email,
          gender: updated.gender || "male",
          plan_name: updated.plan_name,
          start_date: updated.start_date,
          end_date: updated.end_date,
          status: updated.status,
          frozen_at: updated.frozen_at || null,
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
        setMember(newSession);
      }
    });

    return () => unsubscribe();
  }, [member?.id]);

  return (
    <MemberAuthContext.Provider value={{ member, isLoading, login, logout }}>
      {children}
    </MemberAuthContext.Provider>
  );
};

export const useMemberAuth = () => {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) throw new Error('useMemberAuth must be used within MemberAuthProvider');
  return ctx;
};