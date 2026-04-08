import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      <AdminSidebar />
      <main className="flex-1 h-screen overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
