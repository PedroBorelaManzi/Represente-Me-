import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Calendar, 
  Map as MapIcon, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Início', href: '/', icon: LayoutDashboard },
    { name: 'Pedidos', href: '/pedidos', icon: ShoppingBag },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Empresas', href: '/empresas', icon: Building2 },
    { name: 'Agenda', href: '/agenda', icon: Calendar },
    { name: 'Mapa', href: '/mapa', icon: MapIcon },
    { name: 'Integrações', href: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className=\"min-h-screen bg-slate-50 dark:bg-zinc-950 flex font-inter tracking-tight\">
      {/* Sidebar - Desktop */}
      <aside className=\"hidden lg:flex flex-col w-72 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 fixed h-full z-40 transition-all duration-300\">
        <div className=\"p-8 pb-4 flex items-center gap-3\">
          <div className=\"w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none animate-float\">
            <Zap className=\"w-6 h-6 text-white\" />
          </div>
          <div>
            <h1 className=\"text-xl font-black text-slate-900 dark:text-white tracking-tighter italic\">REPRESENTE-ME</h1>
            <p className=\"text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-[-2px]\">SaaS Solutions</p>
          </div>
        </div>

        <nav className=\"flex-1 px-4 mt-8 space-y-1 overflow-y-auto custom-scrollbar\">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 relative ${
                  isActive 
                    ? 'bg-slate-50 dark:bg-zinc-800/50 text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/30'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-bold ${isActive ? 'font-black' : ''}`}>{item.name}</span>
                {isActive && (
                  <motion.div 
                    layoutId=\"activeNav\"
                    className=\"absolute left-0 w-1 h-6 bg-indigo-600 rounded-r-full\"
                    transition={{ type: \"spring\", stiffness: 300, damping: 30 }}
                  />
                )}
                <ChevronRight className={`w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 ${isActive ? 'text-indigo-600' : ''}`} />
              </Link>
            );
          })}
        </nav>

        <div className=\"p-4 mb-4\">
          <button
            onClick={handleSignOut}
            className=\"flex items-center gap-3 w-full px-4 py-3.5 text-slate-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 rounded-2xl transition-all duration-300 group\"
          >
            <LogOut className=\"w-5 h-5 group-hover:-translate-x-1 transition-transform\" />
            <span className=\"text-sm font-bold tracking-tight\">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className=\"flex-1 lg:ml-72 min-h-screen relative flex flex-col\">
        {/* Header */}
        <header className=\"bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-zinc-800 h-20 sticky top-0 z-30 transition-all duration-300\">
          <div className=\"h-full px-4 lg:px-8 flex items-center justify-between\">
            <div className=\"flex items-center gap-4 lg:hidden\">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className=\"p-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors\"
              >
                <Menu className=\"w-6 h-6\" />
              </button>
              <h1 className=\"text-lg font-black text-slate-900 dark:text-white italic tracking-tighter\">REPRESENTE-ME</h1>
            </div>

            <div className=\"hidden md:flex items-center bg-slate-100 dark:bg-zinc-800/80 rounded-2xl px-4 py-2.5 w-96 group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all\">
              <Search className=\"w-4 h-4 text-slate-400 dark:text-zinc-500\" />
              <input 
                type=\"text\" 
                placeholder=\"Buscar no sistema...\" 
                className=\"bg-transparent border-none focus:ring-0 text-sm ml-3 w-full text-slate-700 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium\"
              />
            </div>

            <div className=\"flex items-center gap-3 lg:gap-4\">
              <button className=\"p-2.5 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all relative group\">
                <Bell className=\"w-5 h-5 group-hover:rotate-12 transition-transform\" />
                <span className=\"absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm\"></span>
              </button>
              <div className=\"h-8 w-[1px] bg-slate-200 dark:bg-zinc-800\"></div>
              <div className=\"flex items-center gap-3 pl-1\">
                <div className=\"text-right hidden sm:block\">
                  <p className=\"text-sm font-black text-slate-900 dark:text-zinc-100\">{user?.email?.split('@')[0]}</p>
                  <p className=\"text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest\">Admin Master</p>
                </div>
                <div className=\"w-10 h-10 bg-slate-200 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border-2 border-white dark:border-zinc-800 shadow-sm ring-1 ring-slate-200 dark:ring-zinc-800 overflow-hidden group cursor-pointer\">
                  <div className=\"w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-700 group-hover:scale-110 transition-transform\" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className=\"p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 bg-slate-50/50 dark:bg-zinc-950/50\">
          {children}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className=\"fixed inset-0 z-50 lg:hidden\">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className=\"absolute inset-0 bg-slate-900/60 backdrop-blur-sm\"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className=\"absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-zinc-900 shadow-2xl flex flex-col p-6\"
            >
              <div className=\"flex items-center justify-between mb-10\">
                <div className=\"flex items-center gap-3\">
                  <div className=\"w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center\">
                    <Zap className=\"w-6 h-6 text-white\" />
                  </div>
                  <h1 className=\"text-xl font-black text-slate-900 dark:text-white italic tracking-tighter\">REPRESENTE-ME</h1>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className=\"p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors\"
                >
                  <X className=\"w-6 h-6\" />
                </button>
              </div>

              <nav className=\"flex-1 space-y-2\">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-base font-bold transition-all duration-300 ${
                        isActive 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-100/50 dark:shadow-none' 
                          : 'text-slate-500 dark:text-zinc-400'
                      }`}
                    >
                      <item.icon className=\"w-6 h-6\" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <button
                onClick={handleSignOut}
                className=\"mt-auto flex items-center gap-4 px-4 py-4 text-slate-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 rounded-2xl transition-all duration-300 font-bold\"
              >
                <LogOut className=\"w-6 h-6\" />
                Sair do Sistema
              </button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
