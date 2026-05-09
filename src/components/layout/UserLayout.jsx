import { Outlet } from "react-router-dom";
import MobileNav from "./MobileNav";
import TopHeader from "./TopHeader";
import { MemberAuthProvider, useMemberAuth } from "@/lib/MemberAuthContext";
import MemberLoginScreen from "@/components/MemberLoginScreen";

function UserLayoutInner() {
  const { member, isLoading } = useMemberAuth();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return <MemberLoginScreen />;
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col max-w-md mx-auto">
      <TopHeader />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}

export default function UserLayout() {
  return (
    <MemberAuthProvider>
      <UserLayoutInner />
    </MemberAuthProvider>
  );
}