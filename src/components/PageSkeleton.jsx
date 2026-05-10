export default function PageSkeleton() {
  return (
    <div className="px-4 pt-4 pb-24 space-y-4 animate-pulse">
      <div className="h-7 w-40 bg-muted rounded-lg" />
      <div className="h-32 w-full bg-muted rounded-2xl" />
      <div className="h-24 w-full bg-muted rounded-2xl" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  );
}