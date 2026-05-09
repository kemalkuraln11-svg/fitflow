import { Outlet } from "react-router-dom";
import MobileNav from "./MobileNav";

export default function UserLayout() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-md mx-auto">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}