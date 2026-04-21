import { supabase } from './supabase';

export type EmailProvider = 'google' | 'microsoft';

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  folder: string;
  fullBody?: string;
  to?: string;
}

// 1. GERAÇÃO DE URLS DE AUTENTICAÇÃO
export function getGoogleEmailAuthUrl() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID não configurado.");
  
  const redirectUri = `${window.location.origin}/auth/callback/email`;
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email"
  ].join(" ");

  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&access_type=offline&prompt=consent&state=google`;
}

export function getMicrosoftEmailAuthUrl() {
  const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("VITE_MICROSOFT_CLIENT_ID não configurado.");
  
  const redirectUri = `${window.location.origin}/auth/callback/email`;
  const scopes = ["offline_access", "User.Read", "Mail.ReadWrite", "Mail.Send"].join(" ");

  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent(scopes)}&prompt=select_account&state=microsoft`;
}

// 2. RECUPERAÇÃO DE TOKENS VALIDADOS DO BANCO
export async function getValidEmailToken(userId: string, provider: EmailProvider) {
  const { data: tokenData, error } = await supabase
    .from('user_email_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (error || !tokenData) {
    console.error("Token não encontrado para o usuário:", userId);
    return null;
  }

  const isExpired = new Date(tokenData.expires_at).getTime() < Date.now();
  if (isExpired && tokenData.refresh_token) {
     console.log("Token expirado, renovando...");
     return await refreshEmailToken(userId, provider, tokenData.refresh_token);
  }
  return tokenData.access_token;
}

async function refreshEmailToken(userId: string, provider: EmailProvider, refreshToken: string) {
  let endpoint = "";
  let bodyRequest = new URLSearchParams();

  if (provider === 'google') {
    endpoint = "https://oauth2.googleapis.com/token";
    bodyRequest.append("client_id", import.meta.env.VITE_GOOGLE_CLIENT_ID);
    bodyRequest.append("client_secret", import.meta.env.VITE_GOOGLE_CLIENT_SECRET);
    bodyRequest.append("refresh_token", refreshToken);
    bodyRequest.append("grant_type", "refresh_token");
  } else {
    endpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    bodyRequest.append("client_id", import.meta.env.VITE_MICROSOFT_CLIENT_ID);
    bodyRequest.append("client_secret", import.meta.env.VITE_MICROSOFT_CLIENT_SECRET || "");
    bodyRequest.append("refresh_token", refreshToken);
    bodyRequest.append("grant_type", "refresh_token");
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyRequest
    });
    
    if (!res.ok) return null;
    
    const tokens = await res.json();
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
    const newRefreshToken = tokens.refresh_token || refreshToken;

    await supabase
      .from('user_email_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: newRefreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('provider', provider);

    return tokens.access_token;
  } catch (error) {
    console.error("Erro no refresh token", error);
    return null;
  }
}

// 3. COMUNICAÇÃO REAL (GMAIL)
export async function fetchEmailsFromApi(userId: string, provider: EmailProvider, folder: string, pageToken?: string, category?: string) {
  const token = await getValidEmailToken(userId, provider);
  if (!token) return { success: false, error: "Reautenticação necessária" };

  if (provider === 'google') {
    try {
      const folderToLabel: Record<string, string> = {
        'inbox': 'INBOX',
        'sent': 'SENT',
        'drafts': 'DRAFT',
        'trash': 'TRASH',
        'starred': 'STARRED',
        'important': 'IMPORTANT',
        'spam': 'SPAM',
        'snoozed': 'SNOOZED',
        'all': ''
      };
      
      const labelIds: string[] = [];
      const baseLabel = folderToLabel[folder];
      if (baseLabel) labelIds.push(baseLabel);
      if (category) labelIds.push(category);

      let urlParams = new URLSearchParams();
      urlParams.append('maxResults', '20');
      if (labelIds.length > 0) {
        labelIds.forEach(id => urlParams.append('labelIds', id));
      }
      if (pageToken) urlParams.append('pageToken', pageToken);

      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${urlParams.toString()}`;
      
      const listRes = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!listRes.ok) {
        const errorText = await listRes.text();
        console.error("Erro na API do Gmail (list):", errorText);
        throw new Error("Erro ao listar mensagens");
      }
      const listData = await listRes.json();
      
      if (!listData.messages || listData.messages.length === 0) {
        return { success: true, emails: [], nextPageToken: null };
      }

      const emailDetails = await Promise.all(listData.messages.map(async (msg: any) => {
         try {
           const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
             headers: { 'Authorization': `Bearer ${token}` }
           });
           const detail = await detailRes.json();
           
           const headers = detail.payload.headers;
           const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
           
           const dateStr = getHeader("Date");
           const date = dateStr ? new Date(dateStr) : new Date();
           const formattedTime = date.toLocaleDateString() === new Date().toLocaleDateString() 
              ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : date.toLocaleDateString([], { day: '2-digit', month: 'short' });

           return {
             id: detail.id,
             from: getHeader("From").split("<")[0].replace(/"/g, "").trim() || getHeader("From"),
             to: getHeader("To").split("<")[0].replace(/"/g, "").trim() || getHeader("To"),
             subject: getHeader("Subject") || "(Sem Assunto)",
             preview: detail.snippet || "",
             time: formattedTime,
             unread: detail.labelIds?.includes("UNREAD") || false,
             folder: folder,
             fullBody: detail.snippet 
           };
         } catch (e) {
           console.error("Erro ao processar detalhe de mensagem:", msg.id, e);
           return null;
         }
      }));

      return { 
        success: true, 
        emails: emailDetails.filter(e => e !== null), 
        nextPageToken: listData.nextPageToken || null 
      };

    } catch (err) {
      console.error("Erro no fluxo do Gmail:", err);
      return { success: false, error: "Falha ao buscar e-mails" };
    }
  }

  return { success: true, emails: [], nextPageToken: null }; 
}

export async function sendEmailViaApi(userId: string, provider: EmailProvider, to: string, subject: string, text: string) {
  const token = await getValidEmailToken(userId, provider);
  if (!token) return { success: false, error: "Token inválido ou expirado" };

  if (provider === 'google') {
    try {
      const mimeMessage = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        text
      ].join('\r\n');

      const encodedMessage = btoa(unescape(encodeURIComponent(mimeMessage)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedMessage })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Erro ao enviar e-mail");
      }
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Falha no envio" };
    }
  }
  
  return { success: false, error: "Provedor não suportado para envio no momento" };
}
