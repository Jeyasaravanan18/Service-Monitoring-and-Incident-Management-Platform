import env from "../config/env.js";

/**
 * Exchange an OAuth authorization code for Google user profile info.
 * @param {string} code The code returned from Google OAuth redirection.
 * @param {string} redirectUri The redirect URI configured in Google console.
 * @returns {Promise<{ email: string, name: string, sub: string }>}
 */
export async function getGoogleUserProfile(code, redirectUri) {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new Error("Google OAuth environment variables (client ID / secret) are missing on the server.");
  }

  // 1. Exchange authorization code for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("[OAuth] Failed to exchange code:", errorText);
    throw new Error("Google token exchange failed. Check Google OAuth configuration.");
  }

  const tokens = await tokenResponse.json();
  const accessToken = tokens.access_token;

  if (!accessToken) {
    throw new Error("Google did not return an access token.");
  }

  // 2. Fetch user profile information using the access token
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    const errorText = await profileResponse.text();
    console.error("[OAuth] Failed to fetch profile:", errorText);
    throw new Error("Failed to retrieve Google user profile.");
  }

  const profile = await profileResponse.json();
  return {
    email: profile.email,
    name: profile.name,
    sub: profile.sub, // Google unique identifier
  };
}
