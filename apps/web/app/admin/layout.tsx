'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Breadcrumbs from './components/Breadcrumbs';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-deep-navy overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top bar with mobile hamburger + breadcrumbs */}
        <header className="sticky top-0 z-10 flex items-center gap-3 px-5 py-3 border-b border-navy-700 bg-deep-navy/95 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <Breadcrumbs />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
