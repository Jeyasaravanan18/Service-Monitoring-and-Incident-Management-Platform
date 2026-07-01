import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { z } from "zod";
import env from "../config/env.js";
import { loginUser, registerUser, revokeRefreshToken, rotateRefreshToken, resendVerificationEmail, resetPasswordWithToken, verifyEmailWithToken, sendPasswordReset, loginOrRegisterGoogleUser, linkGoogleAccount } from "../services/authService.js";
import { getGoogleUserProfile } from "../services/oauthService.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../utils/apiError.js";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = authSchema.extend({
  name: z.string().min(2),
  workspaceName: z.string().min(2),
  role: z.enum(["super-admin", "admin", "viewer"]).optional().default("admin"),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(6),
  password: z.string().min(8),
});

const router = Router();

router.post("/register", asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body);
  const session = await registerUser(payload);
  res.status(201).json({ success: true, data: session });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const payload = authSchema.parse(req.body);
  const session = await loginUser(payload);
  res.json({ success: true, data: session });
}));

router.post("/logout", asyncHandler(async (req, res) => {
  const token = req.body.refreshToken;
  if (token) {
    await revokeRefreshToken(token);
  }
  res.json({
    success: true,
    data: {
      message: "Logged out successfully.",
    },
  });
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const token = req.body.refreshToken;
  if (!token) {
    throw new ApiError(400, "Refresh token required");
  }
  const session = await rotateRefreshToken(token);
  res.json({ success: true, data: session });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.auth,
    },
  });
}));

router.post("/forgot-password", asyncHandler(async (req, res) => {
  const payload = forgotSchema.parse(req.body);
  await sendPasswordReset(payload.email);
  res.json({
    success: true,
    data: {
      message: "If the account exists, a password reset link has been sent.",
    },
  });
}));

router.post("/reset-password", asyncHandler(async (req, res) => {
  const payload = resetSchema.parse(req.body);
  await resetPasswordWithToken(payload.token, payload.password);
  res.json({
    success: true,
    data: {
      message: "Password reset updated.",
    },
  });
}));

router.post("/verify-email", asyncHandler(async (req, res) => {
  const payload = z.object({ token: z.string().min(6) }).parse(req.body);
  await verifyEmailWithToken(payload.token);
  res.json({
    success: true,
    data: {
      message: "Email verified.",
    },
  });
}));

router.post("/resend-verification", asyncHandler(async (req, res) => {
  const payload = forgotSchema.parse(req.body);
  await resendVerificationEmail(payload.email);
  res.json({
    success: true,
    data: {
      message: "If the account exists, a verification link has been sent.",
    },
  });
}));

// Route for Google Login & Sign Up
router.get("/google/config", asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      clientId: env.googleClientId,
    },
  });
}));

router.post("/google", asyncHandler(async (req, res) => {
  const payload = z.object({
    code: z.string(),
    redirectUri: z.string(),
  }).parse(req.body);

  const googleProfile = await getGoogleUserProfile(payload.code, payload.redirectUri);
  const session = await loginOrRegisterGoogleUser(googleProfile);

  res.json({
    success: true,
    data: session,
  });
}));

// Route for Linking Google to logged-in user profile
router.post("/google/link", requireAuth, asyncHandler(async (req, res) => {
  const payload = z.object({
    code: z.string(),
    redirectUri: z.string(),
  }).parse(req.body);

  const googleProfile = await getGoogleUserProfile(payload.code, payload.redirectUri);
  const user = await linkGoogleAccount(req.auth.sub, googleProfile);

  res.json({
    success: true,
    data: {
      message: "Google Account successfully linked.",
      googleId: user.googleId,
    },
  });
}));

export default router;
