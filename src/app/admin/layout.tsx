export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Client component AdminSidebar will load inside
  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      <nav>
          {/* Workaround for fast import via require since it's a server component layout mixing with client */}
      </nav>
      {/* Cần import AdminSidebar nhưng do Next Server config, render thẳng từ layout */}
      <SidebarWrapper />
      <main className="flex-1 h-screen overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}

import AdminSidebar from '@/components/AdminSidebar';

function SidebarWrapper() {
   return <AdminSidebar />;
}
