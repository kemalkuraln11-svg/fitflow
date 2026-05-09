import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TAB_ROUTES = ["/", "/calendar", "/profile"];

export default function TopHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTab = TAB_ROUTES.includes(location.pathname);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border flex items-center h-14 px-4 shrink-0">
      {isTab ? (
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <img
            src="https://media.base44.com/images/public/69ff298a8db8d1511d286b61/2bf5548a7_ChatGPTImage9May202623_29_58.png"
            alt="FitKafa"
            className="w-7 h-7 rounded-full object-cover"
          />
          <span className="font-bold text-lg tracking-tight">FitKafa-Hyrox</span>
        </button>
      ) : (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Geri</span>
        </button>
      )}
    </header>
  );
}