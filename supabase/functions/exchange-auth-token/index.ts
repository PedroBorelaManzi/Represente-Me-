import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
Deno.serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: CORS_HEADERS
    });
  }
  try {
    const { code, redirect_uri, refresh_token, grant_type } = await req.json();
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        error: "Google OAuth not configured on server"
      }), {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json"
        }
      });
    }
    const body = {
      client_id: clientId,
      client_secret: clientSecret
    };
    if (grant_type === "refresh_token" && refresh_token) {
      body.refresh_token = refresh_token;
      body.grant_type = "refresh_token";
    } else if (code && redirect_uri) {
      body.code = code;
      body.redirect_uri = redirect_uri;
      body.grant_type = "authorization_code";
    } else {
      return new Response(JSON.stringify({
        error: "Missing required parameters (code+redirect_uri or refresh_token)"
      }), {
        status: 400,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json"
        }
      });
    }
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(body)
    });
    const data = await response.json();
    if (data.error) {
      return new Response(JSON.stringify({
        error: data.error_description || data.error
      }), {
        status: 400,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json"
        }
      });
    }
    // Only return safe fields - never expose client_secret
    const safeResponse = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope
    };
    // Only include refresh_token if present (initial exchange)
    if (data.refresh_token) {
      safeResponse.refresh_token = data.refresh_token;
    }
    return new Response(JSON.stringify(safeResponse), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json"
      }
    });
  }
});
