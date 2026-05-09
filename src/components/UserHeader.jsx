export default function UserHeader() {
  return (
    <div className="sticky top-0 z-30 bg-background border-b border-border px-8 py-5">
      <div className="max-w-[1400px] mx-auto flex items-center gap-3">
        <img
          src="https://media.base44.com/images/public/69ff298a8db8d1511d286b61/2bf5548a7_ChatGPTImage9May202623_29_58.png"
          alt="FitKafa"
          className="w-8 h-8 rounded-full object-cover"
        />
        <div>
          <p className="font-bold text-sm">FitKafa-Hyrox</p>
        </div>
      </div>
    </div>
  );
}