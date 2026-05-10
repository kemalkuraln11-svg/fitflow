import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageSkeleton from '@/components/PageSkeleton';

const TAB_PATHS = ['/', '/calendar', '/profile'];

export default function AnimatedRoutes({ children }) {
  const location = useLocation();
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const isTabSwitch = TAB_PATHS.includes(location.pathname);
    if (!isTabSwitch) return;

    // Sadece skeleton göster — invalidate etme, staleTime bunu yönetir
    setShowSkeleton(true);
    const timer = setTimeout(() => setShowSkeleton(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait">
      {showSkeleton ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <PageSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}