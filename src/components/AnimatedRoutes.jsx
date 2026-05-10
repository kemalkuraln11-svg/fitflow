import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import PageSkeleton from '@/components/PageSkeleton';

const TAB_PATHS = ['/', '/calendar', '/profile'];

export default function AnimatedRoutes({ children }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showSkeleton, setShowSkeleton] = useState(false);
  const prevPath = useState(location.pathname)[0];

  useEffect(() => {
    const isTabSwitch = TAB_PATHS.includes(location.pathname);
    if (!isTabSwitch) return;

    setShowSkeleton(true);
    queryClient.invalidateQueries();

    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, 400);

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