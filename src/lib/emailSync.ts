import { supabase } from './supabase';

export type EmailProvider = 'google' | 'microsoft';

export interface EmailMessage {
  id: string;
  from: string;
  fromEmail?: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  folder: string;
  fullBody?: string;
  to?: string;
  toEmail?: string;
  fullDate?: string;
}

// 1. GERAÇÃO DE URLS DE AUTENTICAÇÃO
export function getGoogleEmailAuthUrl() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID não configurado.");
  
  const redirectUri = `${window.location.origin}/auth/callback/email`;
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/contacts.readonly"
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
export async function getValidEmailToken(userId: string, provider: EmailProvider, emailAddress?: string) {
  let query = supabase
    .from('user_email_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider);

  if (emailAddress) {
    query = query.eq('email_address', emailAddress);
  }

  const { data: tokenData, error } = await (emailAddress ? query.maybeSingle() : query.limit(1).maybeSingle());

  if (error || !tokenData) {
    console.error("Token não encontrado para o usuário:", userId);
    return null;
  }

  const isExpired = new Date(tokenData.expires_at).getTime() < Date.now();
  if (isExpired && tokenData.refresh_token) {
     return await refreshEmailToken(userId, provider, tokenData.refresh_token, tokenData.email_address);
  }
  return tokenData.access_token;
}

async function refreshEmailToken(userId: string, provider: EmailProvider, refreshToken: string, emailAddress?: string) {
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

    const query = supabase
      .from('user_email_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: newRefreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('provider', provider);

    if (emailAddress) {
      query.eq('email_address', emailAddress);
    }

    await query;

    return tokens.access_token;
  } catch (error) {
    console.error("Erro no refresh token", error);
    return null;
  }
}

// Helper to decode Gmail Base64
function base64Decode(str: string) {
  try {
    return decodeURIComponent(
      atob(str.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    try {
      return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    } catch (e2) {
      return "";
    }
  }
}

// 3. COMUNICAÇÃO REAL (GMAIL)
export async function fetchEmailsFromApi(userId: string, provider: EmailProvider, folder: string, pageToken?: string, category?: string, emailAddress?: string, searchQuery?: string) {
  const token = await getValidEmailToken(userId, provider, emailAddress);
  if (!token) return { success: false, error: "Token não disponível" };

  if (provider === 'google') {
    try {
      let q = "";
      if (folder === 'inbox') q = "label:INBOX";
      else if (folder === 'sent') q = "label:SENT";
      else if (folder === 'trash') q = "label:TRASH";
      else if (folder === 'spam') q = "label:SPAM";
      else if (folder === 'drafts') q = "label:DRAFT";

      if (category) q += ` label:${category}`;
      if (searchQuery) q += ` ${searchQuery}`;

      const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      listUrl.searchParams.append('maxResults', '20');
      if (q) listUrl.searchParams.append('q', q);
      if (pageToken) listUrl.searchParams.append('pageToken', pageToken);

      const listRes = await fetch(listUrl.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!listRes.ok) return { success: false, error: "Falha na API do Gmail" };
      const listData = await listRes.json();
      
      const emailDetails = await Promise.all((listData.messages || []).map(async (msg: any) => {
        try {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const detail = await detailRes.json();
          const headers = detail.payload.headers;
          const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
          
          const parseEmailHeader = (raw: string) => {
            if (!raw) return { name: "", email: "" };
            const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
            if (match) return { name: match[1].replace(/"/g, "").trim(), email: match[2].trim() };
            return { name: raw.split("@")[0].replace(/"/g, "").trim(), email: raw.trim() };
          };

          const fromInfo = parseEmailHeader(getHeader("From"));
          const toInfo = parseEmailHeader(getHeader("To"));
          const dateStr = getHeader("Date");
          const date = dateStr ? new Date(dateStr) : new Date();
          const formattedTime = date.toLocaleDateString() === new Date().toLocaleDateString() 
             ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
             : date.toLocaleDateString([], { day: '2-digit', month: 'short' });

          let body = "";
          let isHtml = false;
          const attachments: any[] = [];
          const cids: Record<string, string> = {};

          const processParts = (parts: any[]) => {
            parts.forEach((part: any) => {
              const partMime = part.mimeType?.toLowerCase();
              
              if (partMime === "text/plain" && !body) {
                if (part.body?.data) {
                  body = base64Decode(part.body.data);
                  isHtml = false;
                }
              } else if (partMime === "text/html") {
                if (part.body?.data) {
                  body = base64Decode(part.body.data);
                  isHtml = true;
                }
              } else if (part.parts) {
                processParts(part.parts);
              }
              
              if (part.filename && part.body?.attachmentId) {
                attachments.push({
                  id: part.body.attachmentId,
                  filename: part.filename,
                  mimeType: part.mimeType,
                  size: part.body.size
                });
                
                const cidHeader = part.headers?.find((h: any) => h.name.toLowerCase() === 'content-id')?.value;
                if (cidHeader) {
                  const cid = cidHeader.replace(/[<>]/g, "");
                  if (part.body.data) {
                    cids[cid] = `data:${part.mimeType};base64,${part.body.data}`;
                  }
                }
              }
            });
          };

          if (detail.payload.body?.data) {
            body = base64Decode(detail.payload.body.data);
            isHtml = detail.payload.mimeType === "text/html";
          } else if (detail.payload.parts) {
            processParts(detail.payload.parts);
          }
          
          if (isHtml && body) {
            for (const cid in cids) {
              body = body.replace(new RegExp('cid:' + cid, 'g'), cids[cid]);
            }
          }

          return {
            id: detail.id,
            from: fromInfo.name || fromInfo.email,
            fromEmail: fromInfo.email,
            to: toInfo.name || toInfo.email,
            toEmail: toInfo.email,
            subject: getHeader("Subject") || "(Sem Assunto)",
            preview: detail.snippet || "",
            time: formattedTime,
            fullDate: dateStr || formattedTime,
            unread: detail.labelIds?.includes("UNREAD") || false,
            folder: folder,
            fullBody: body || detail.snippet || "",
            isHtml: isHtml,
            attachments: attachments
          };
        } catch (e) { return null; }
      }));

      return { success: true, emails: emailDetails.filter(e => e !== null), nextPageToken: listData.nextPageToken || null };
    } catch (err) {
      return { success: false, error: "Falha ao buscar e-mails" };
    }
  }
  return { success: true, emails: [], nextPageToken: null }; 
}

export async function sendEmailViaApi(userId: string, provider: EmailProvider, to: string, subject: string, text: string, emailAddress?: string) {
  const token = await getValidEmailToken(userId, provider, emailAddress);
  if (!token) return { success: false, error: "Token não disponível. Reautentique-se." };

  if (provider === 'google') {
    try {
      const mime = [
        `To: ${to}`,
        `Subject: ${subject || '(Sem Assunto)'}`,
        'Content-Type: text/html; charset="UTF-8"',
        'MIME-Version: 1.0',
        '',
        text.replace(/\n/g, '<br>')
      ].join('\r\n');

      const encoder = new TextEncoder();
      const u8a = encoder.encode(mime);
      let binary = "";
      for (let i = 0; i < u8a.length; i++) {
        binary += String.fromCharCode(u8a[i]);
      }
      
      const base64 = btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: base64 })
      });

      if (!response.ok) {
        const err = await response.json();
        return { success: false, error: err.error?.message || "Erro desconhecido na API" };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: "Provedor não suportado." };
}

export async function downloadAttachmentFromApi(userId: string, provider: EmailProvider, messageId: string, attachmentId: string, emailAddress?: string) {
  const token = await getValidEmailToken(userId, provider, emailAddress);
  if (!token) return { success: false, error: "Token não disponível" };

  if (provider === 'google') {
    try {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Erro ao baixar anexo");
      const data = await res.json();
      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: "Provedor não suportado" };
}

export async function fetchGoogleContacts(userId: string, emailAddress?: string) {
  const token = await getValidEmailToken(userId, 'google', emailAddress);
  if (!token) return [];

  try {
    const contactsMap = new Map<string, string>();
    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. Connections
    try {
      const resConn = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=1000', { headers });
      if (resConn.ok) {
        const data = await resConn.json();
        (data.connections || []).forEach((p: any) => {
          const name = p.names?.[0]?.displayName;
          const email = p.emailAddresses?.[0]?.value;
          if (email) contactsMap.set(email, name || email);
        });
      }
    } catch (e) {}

    // 2. OtherContacts
    try {
      const resOther = await fetch('https://people.googleapis.com/v1/otherContacts?readMask=names,emailAddresses&pageSize=1000', { headers });
      if (resOther.ok) {
        const data = await resOther.json();
        (data.otherContacts || []).forEach((p: any) => {
          const name = p.names?.[0]?.displayName;
          const email = p.emailAddresses?.[0]?.value;
          if (email) contactsMap.set(email, name || email);
        });
      }
    } catch (e) {}

    return Array.from(contactsMap.entries()).map(([email, name]) => ({ name, email }));
  } catch (err) {
    return [];
  }
}
