import { Outlet } from "react-router-dom";
import MobileNav from "./MobileNav";

export default function UserLayout() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <main>
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}