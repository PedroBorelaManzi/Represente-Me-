import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

interface AuditLogEntry {
  user_id: string;
  action: string;
  metadata: any;
  created_at: string;
}

let auditBuffer: AuditLogEntry[] = [];
let batchTimeout: any = null;
let cachedUserId: string | null = null;

// Listen to auth changes to cache user ID and clean buffer on logout
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    cachedUserId = null;
    auditBuffer = [];
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
  } else if (session?.user) {
    cachedUserId = session.user.id;
  }
});

async function sendAuditBatch() {
  if (auditBuffer.length === 0) return;

  const batchToSend = [...auditBuffer];
  auditBuffer = [];

  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  try {
    const { error } = await supabase.from('audit_logs').insert(batchToSend);
    if (error) throw error;
  } catch (err) {
    console.error("Erro ao registrar lote de log de auditoria:", err);
  }
}

export async function logAudit(action: string, metadata: any = {}) {
  try {
    let userId = cachedUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
      cachedUserId = user.id;
    }

    const entry: AuditLogEntry = {
      user_id: userId,
      action,
      metadata,
      created_at: new Date().toISOString()
    };

    auditBuffer.push(entry);

    if (auditBuffer.length >= 10) {
      await sendAuditBatch();
    } else if (!batchTimeout) {
      batchTimeout = setTimeout(() => {
        sendAuditBatch();
      }, 30000);
    }
  } catch (err) {
    console.error("Erro ao registrar log de auditoria:", err);
  }
}
