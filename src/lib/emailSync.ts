import { supabase } from './supabase';

export type EmailProvider = 'google' | 'microsoft';

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

  if (error || !tokenData) return null;

  const isExpired = new Date(tokenData.expires_at).getTime() < Date.now();
  if (isExpired && tokenData.refresh_token) {
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

    const { error } = await supabase
      .from('user_email_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: newRefreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('provider', provider);

    if (error) throw error;
    
    return tokens.access_token;
  } catch (error) {
    console.error("Erro no refresh token", error);
    return null;
  }
}

// 3. COMUNICAÇÃO (MOCK PARA TESTE) - Fase de Busca
export async function fetchEmailsFromApi(userId: string, provider: EmailProvider, folder: string) {
  const token = await getValidEmailToken(userId, provider);
  if (!token) return { success: false, error: "Reautenticação necessária" };
  
  // MOCK: Sucesso retornado da API
  return { success: true, emails: [] }; 
}

export async function sendEmailViaApi(userId: string, provider: EmailProvider, to: string, subject: string, text: string) {
  const token = await getValidEmailToken(userId, provider);
  if (!token) return { success: false, error: "Falha na conexão com servidor HTTP" };
  
  // MOCK: Sucesso retornado da API
  return { success: true };
}
