import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  Mail, 
  Lock, 
  Loader2, 
  Sparkles, 
  Layout,
  Zap,
  MapPin,
  Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar sua solicitaÃ§Ã£o');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-white dark:bg-zinc-950 flex flex-col lg:flex-row relative overflow-hidden'>
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-50/50 dark:bg-violet-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <div className='hidden lg:flex flex-1 flex-col justify-between p-16 relative z-10'>
        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 bg-indigo-600 rounded-[18px] flex items-center justify-center shadow-indigo-200 shadow-xl'>
            <Layout className='w-6 h-6 text-white' />
          </div>
          <span className='text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter'>Represente-Me</span>
        </div>

        <div className='max-w-xl'>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className='flex items-center gap-2 mb-6 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full w-fit text-[10px] font-black uppercase tracking-widest'
          >
            <Sparkles className='w-3 h-3 fill-current' /> IA Agentic para Representantes
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-8'
          >
            Venda mais com <br />
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600'>InteligÃªncia Digital</span>
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className='grid grid-cols-2 gap-8'
          >
            <div className='space-y-2'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-slate-50 dark:bg-zinc-900 rounded-xl'><Zap className='w-4 h-4 text-indigo-600' /></div>
                <span className='text-xs font-black uppercase tracking-tight text-slate-900 dark:text-zinc-100'>IA Agentic</span>
              </div>
              <p className='text-[10px] font-bold text-slate-400 uppercase leading-relaxed'>ExtraÃ§Ã£o inteligente de pedidos e insights de mercado.</p>
            </div>
            <div className='space-y-2'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-slate-50 dark:bg-zinc-900 rounded-xl'><MapPin className='w-4 h-4 text-indigo-600' /></div>
                <span className='text-xs font-black uppercase tracking-tight text-slate-900 dark:text-zinc-100'>Geo-Mapeamento</span>
              </div>
              <p className='text-[10px] font-bold text-slate-400 uppercase leading-relaxed'>Mapeie sua regiÃ£o e nunca perca um cliente ativo no radar.</p>
            </div>
          </motion.div>
        </div>

        <div className='flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400'>
          <span className='flex items-center gap-2'><ShieldCheck className='w-3 h-3' /> Dados Protegidos</span>
          <span className='w-1.5 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full' />
          <span className='flex items-center gap-2'><Globe className='w-3 h-3' /> Cloud Brasileira</span>
        </div>
      </div>

      {/* Form Section */}
      <div className='flex-1 flex flex-col justify-center items-center p-8 lg:p-16 relative z-10'>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className='w-full max-w-[440px] bg-white dark:bg-zinc-900 p-10 lg:p-14 rounded-[48px] border border-slate-100 dark:border-zinc-800 shadow-2xl'
        >
          <div className='mb-12'>
            <h2 className='text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2'>
              Acessar CRM
            </h2>
            <p className='text-sm font-bold text-slate-400 uppercase tracking-tight'>
              Digite suas credenciais para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-4'>
              <div className='relative group'>
                <label className='text-[10px] font-black uppercase text-slate-400 ml-4 mb-1.5 block tracking-widest group-focus-within:text-indigo-600 transition-colors'>Seu E-mail</label>
                <div className='relative'>
                  <Mail className='absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-all' />
                  <input 
                    type='email' 
                    required 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder='nome@empresa.com.br' 
                    className='w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-[20px] font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all dark:text-zinc-100' 
                  />
                </div>
              </div>

              <div className='relative group'>
                <label className='text-[10px] font-black uppercase text-slate-400 ml-4 mb-1.5 block tracking-widest group-focus-within:text-indigo-600 transition-colors'>Sua Senha</label>
                <div className='relative'>
                  <Lock className='absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-600 transition-all' />
                  <input 
                    type='password' 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder='â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' 
                    className='w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-[20px] font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all dark:text-zinc-100' 
                  />
                </div>
              </div>
            </div>

            <div className='flex justify-end'>
              <button type='button' className='text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors'>Recuperar Senha</button>
            </div>

            <button 
              type='submit' 
              disabled={loading} 
              className='w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group'
            >
              {loading ? <Loader2 className='w-4 h-4 animate-spin' /> : (
                <>
                  Entrar
                  <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                </>
              )}
            </button>
          </form>

          <div className='mt-10 text-center'>
            <button 
              onClick={() => window.location.href = '/#planos'}
              className='text-[11px] font-bold text-slate-400 uppercase tracking-tight hover:text-slate-600 transition-colors'
            >
              Nao possui conta ainda? 
              <span className='text-indigo-600 font-black ml-1'>Cadastre-se JÃ¡</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}