import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <main className="safe-top flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
