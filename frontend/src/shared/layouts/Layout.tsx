// frontend/src/shared/layouts/Layout.tsx
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Settings2, Users, Gift, ScrollText, UserCog, LogOut, HeartHandshake, Sliders } from 'lucide-react';
import { getUser } from '../../features/auth/auth';
import { Button } from '../../components/ui/button';
import { cn } from '../../utils/utils';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const usuario = getUser() as any;

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
    { to: '/admin/operacoes', icon: Settings2, label: 'Operações', adminOnly: false },
    { to: '/admin/clientes', icon: Users, label: 'Clientes', adminOnly: false },
    { to: '/admin/premios', icon: Gift, label: 'Recompensas', adminOnly: true },
    { to: '/admin/configuracoes', icon: Sliders, label: 'Configurações', adminOnly: true },
    { to: '/admin/auditoria', icon: ScrollText, label: 'Auditoria', adminOnly: true },
    { to: '/admin/usuarios', icon: UserCog, label: 'Usuários Internos', adminOnly: true },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden absolute top-4 left-4 z-50 p-2 bg-white text-slate-700 rounded-md shadow-sm border border-slate-200"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Alternar menu"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar background overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-100 mt-12 lg:mt-0">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <HeartHandshake size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">Loyalty</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          {navItems.map((item) => {
            if (item.adminOnly && usuario?.role !== 'admin') return null;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 px-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase">
              {usuario?.nome?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-900 truncate">
                {usuario?.nome || 'Usuário'}
              </span>
              <span className="text-xs text-slate-500 capitalize">
                {usuario?.role || 'operador'}
              </span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-2" />
            Encerrar Sessão
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="w-full h-full p-4 lg:p-8 flex justify-center">
            <div className="w-full max-w-6xl">
                <Outlet />
            </div>
        </div>
      </main>
    </div>
  );
}

export default Layout;
