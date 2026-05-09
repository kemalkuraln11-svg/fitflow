import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

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
      if (parsed.status === 'frozen' || endDate <= today) {
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        setMember(parsed);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    const results = await base44.entities.Membership.filter({
      username: username.toLowerCase().trim(),
      password: password,
    });

    if (!results || results.length === 0) {
      throw new Error('Kullanıcı adı veya şifre hatalı');
    }

    const m = results[0];
    if (m.status === 'suspended') throw new Error('Üyeliğiniz askıya alınmıştır. Lütfen iletişime geçin.');
    if (m.status === 'frozen') throw new Error('Üyeliğiniz dondurulmuştur. Lütfen iletişime geçin.');

    // Bitiş tarihi bugünden önceyse giriş yapılamaz
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(m.end_date);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < today) {
      // Eğer status hâlâ active ise expired'a çek
      if (m.status === 'active') {
        await base44.entities.Membership.update(m.id, { status: 'expired' });
      }
      throw new Error('Üyeliğinizin süresi dolmuştur. Lütfen üyeliğinizi yenileyin.');
    }
    if (m.status === 'expired') throw new Error('Üyeliğinizin süresi dolmuştur. Lütfen üyeliğinizi yenileyin.');

    const sessionData = {
      id: m.id,
      user_name: m.user_name,
      username: m.username,
      user_email: m.user_email,
      plan_name: m.plan_name,
      start_date: m.start_date,
      end_date: m.end_date,
      status: m.status,
      frozen_at: m.frozen_at || null,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    setMember(sessionData);
    return sessionData;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setMember(null);
  };

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