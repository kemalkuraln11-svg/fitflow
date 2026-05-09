import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, THRESHOLD + 20));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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