import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");


export async function logAudit(action: string, metadata: any = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      metadata,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Erro ao registrar log de auditoria:", err);
  }
}