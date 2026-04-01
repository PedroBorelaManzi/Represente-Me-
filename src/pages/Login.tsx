import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, LogIn, UserPlus, Heart, Boxes, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error("As senhas não coincidem");
    }
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });
      if (error) throw error;
      if (data?.user) {
        toast.success("Conta criada com sucesso! Faça login.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC]">
      {/* Left Side: Branding */}
      <div className="hidden lg:flex w-1/2 bg-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl -mr-48 -mt-48 opacity-50" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-700 rounded-full blur-3xl -ml-48 -mb-48 opacity-50" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white mb-12">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
              <Boxes className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold">Represente-Me!</span>
          </div>
          
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Sua jornada para o <br />
            <span className="text-indigo-200">sucesso começa aqui.</span>
          </h1>
          <p className="text-indigo-100 text-lg max-w-md">
            Simplificamos a gestão da sua representação comercial para você focar no que importa: vender mais.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6">
          <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
            <ShieldCheck className="h-6 w-6 text-white mb-3" />
            <h3 className="text-white font-semibold mb-1">Backup Seguro</h3>
            <p className="text-indigo-200 text-sm">Dados salvos em tempo real na nuvem.</p>
          </div>
          <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
            <LogIn className="h-6 w-6 text-white mb-3" />
            <h3 className="text-white font-semibold mb-1">Acesso Rápido</h3>
            <p className="text-indigo-200 text-sm">Logon ágil em qualquer dispositivo.</p>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
              {isLogin ? "Bem-vindo de volta!" : "Crie sua conta!"}
            </h2>
            <p className="text-slate-500">
              {isLogin ? "Acesse sua conta para continuar." : "Comece a organizar suas representações hoje."}
            </p>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-5"
                >
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      required={!isLogin}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Seu Nome"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  key="confirm-password-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-5"
                >
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      required={!isLogin}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              disabled={loading}
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? "Entrar na Conta" : "Criar Minha Conta"}
                  <ShieldCheck className="h-4 w-4 group-hover:translate-x-0.5 transition-transform text-white/70" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center space-x-2">
            <span className="text-sm text-slate-500">
              {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
            </span>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              {isLogin ? "Cadastre-se" : "Faça Login"}
            </button>
          </div>

          <div className="mt-8 flex justify-center items-center gap-1.5 grayscale opacity-50 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
            <span>Powered by</span>
            <Heart className="h-3 w-3 fill-red-400 text-red-400" />
            <span>Success</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

