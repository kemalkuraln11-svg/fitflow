import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPullDistance(0);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault?.();
      setPullDistance(Math.min(diff * 0.6, THRESHOLD + 30));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto overscroll-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : refreshing ? `${THRESHOLD}px` : 0 }}
      >
        <RefreshCw
          className="w-5 h-5 text-primary transition-transform"
          style={{
            transform: `rotate(${progress * 360}deg)`,
            opacity: progress,
            animation: refreshing ? "spin 0.8s linear infinite" : "none",
          }}
        />
      </div>
      {children}
    </div>
  );
}