import { apiGet } from "./api.js";

/**
 * Redirects the browser to Google's OAuth consent screen.
 * @param {"login" | "link"} state Defines if we are logging in or linking accounts.
 */
export async function redirectToGoogle(state = "login") {
  try {
    const response = await apiGet("/auth/google/config");
    const clientId = response.data?.clientId;
    if (!clientId) {
      alert("Google Client ID is not configured on the server. Please add GOOGLE_CLIENT_ID to the backend .env file.");
      return;
    }
    const redirectUri = window.location.origin + "/auth/google/callback";
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(
      "openid profile email"
    )}&state=${state}&prompt=select_account`;
    window.location.href = googleAuthUrl;
  } catch (err) {
    console.error("Failed to retrieve Google config:", err);
    alert("Failed to initialize Google login: " + err.message);
  }
}
