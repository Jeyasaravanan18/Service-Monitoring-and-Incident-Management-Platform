import bcrypt from "bcryptjs";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { ApiError } from "../utils/apiError.js";
import { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } from "../utils/tokens.js";
import { AccountToken, RefreshToken, User, Workspace } from "../models/index.js";
import { sendEmailDelivery } from "./deliveryService.js";
import env from "../config/env.js";

export async function registerUser({ name, email, password, workspaceName, role = "admin" }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const workspace = await Workspace.create({
    name: workspaceName,
    slug: `${workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${nanoid(6)}`,
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    passwordHash,
    roles: [role],
    workspaceRoles: [{ workspaceId: workspace._id, role }],
    workspaceIds: [workspace._id],
  });

  workspace.ownerId = user._id;
  await workspace.save();

  await issueVerificationToken(user);

  return await buildSession(user);
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  user.lastLoginAt = new Date();
  await user.save();
  return await buildSession(user);
}

function accountTokenUrl(type, token) {
  const route = type === "password-reset" ? "/auth/reset-password" : "/auth/verify-email";
  return `${env.clientOrigin}${route}?token=${encodeURIComponent(token)}`;
}

async function createAccountToken(userId, type, ttlMinutes) {
  const token = crypto.randomBytes(32).toString("hex");
  await AccountToken.create({
    userId,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  });
  return token;
}

async function issueVerificationToken(user) {
  const token = await createAccountToken(user._id, "email-verification", 60 * 24);
  const link = accountTokenUrl("email-verification", token);
  await sendEmailDelivery({
    to: user.email,
    title: "Verify your Service Monitoring and Incident Management Platform account",
    body: `Verify your email to complete workspace setup: ${link}`,
    meta: { kind: "email-verification", link },
  });
  return token;
}

async function issuePasswordResetToken(user) {
  const token = await createAccountToken(user._id, "password-reset", 30);
  const link = accountTokenUrl("password-reset", token);
  await sendEmailDelivery({
    to: user.email,
    title: "Reset your Service Monitoring and Incident Management Platform password",
    body: `Use this link to reset your password: ${link}`,
    meta: { kind: "password-reset", link },
  });
  return token;
}

export function buildSessionFromPayload(payload) {
  const nextPayload = { ...payload, jti: payload.jti || undefined };
  return {
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      roles: payload.roles,
      workspaceIds: payload.workspaceIds,
    },
    accessToken: signAccessToken(nextPayload),
    refreshToken: signRefreshToken(nextPayload),
  };
}

async function persistRefreshToken(user, refreshToken) {
  const payload = verifyRefreshToken(refreshToken);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    workspaceIds: user.workspaceIds,
    expiresAt: new Date(payload.exp * 1000),
    revokedAt: null,
    replacedByTokenHash: "",
  });
}

async function buildSession(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    roles: user.roles,
    workspaceRoles: (user.workspaceRoles || []).map((item) => ({
      workspaceId: item.workspaceId.toString(),
      role: item.role,
    })),
    workspaceIds: user.workspaceIds.map((id) => id.toString()),
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await persistRefreshToken(user, refreshToken);

  return {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      workspaceRoles: user.workspaceRoles,
      workspaceIds: user.workspaceIds,
      emailVerifiedAt: user.emailVerifiedAt || null,
      googleId: user.googleId || null,
    },
    accessToken,
    refreshToken,
  };
}

export async function rotateRefreshToken(refreshToken) {
  const payload = verifyRefreshToken(refreshToken);
  const record = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken), revokedAt: null }).lean();
  if (!record) {
    throw new ApiError(401, "Refresh token revoked or expired");
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  await RefreshToken.updateOne({ _id: record._id }, { $set: { revokedAt: new Date() } });
  const nextPayload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    roles: user.roles,
    workspaceRoles: (user.workspaceRoles || []).map((item) => ({
      workspaceId: item.workspaceId.toString(),
      role: item.role,
    })),
    workspaceIds: user.workspaceIds.map((id) => id.toString()),
  };
  const nextAccessToken = signAccessToken(nextPayload);
  const nextRefreshToken = signRefreshToken(nextPayload);
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(nextRefreshToken),
    workspaceIds: user.workspaceIds,
    expiresAt: new Date(verifyRefreshToken(nextRefreshToken).exp * 1000),
    revokedAt: null,
    replacedByTokenHash: "",
  });

  await RefreshToken.updateOne({ _id: record._id }, { $set: { replacedByTokenHash: hashToken(nextRefreshToken) } });

  return {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      workspaceRoles: user.workspaceRoles,
      workspaceIds: user.workspaceIds,
      emailVerifiedAt: user.emailVerifiedAt || null,
    },
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
  };
}

export async function revokeRefreshToken(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function sendPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) return;
  await issuePasswordResetToken(user);
}

export async function resetPasswordWithToken(token, password) {
  const tokenHash = hashToken(token);
  const accountToken = await AccountToken.findOne({ tokenHash, type: "password-reset", usedAt: null }).lean();
  if (!accountToken) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  if (new Date(accountToken.expiresAt).getTime() < Date.now()) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  const user = await User.findById(accountToken.userId);
  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  user.passwordHash = await bcrypt.hash(password, 12);
  await user.save();
  await AccountToken.updateOne({ _id: accountToken._id }, { $set: { usedAt: new Date() } });
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function verifyEmailWithToken(token) {
  const tokenHash = hashToken(token);
  const accountToken = await AccountToken.findOne({ tokenHash, type: "email-verification", usedAt: null }).lean();
  if (!accountToken) {
    throw new ApiError(400, "Invalid or expired verification token");
  }
  if (new Date(accountToken.expiresAt).getTime() < Date.now()) {
    throw new ApiError(400, "Invalid or expired verification token");
  }
  const user = await User.findById(accountToken.userId);
  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }
  user.emailVerifiedAt = new Date();
  await user.save();
  await AccountToken.updateOne({ _id: accountToken._id }, { $set: { usedAt: new Date() } });
}

export async function resendVerificationEmail(email) {
  const user = await User.findOne({ email });
  if (!user) return;
  if (user.emailVerifiedAt) return;
  await issueVerificationToken(user);
}

export async function loginOrRegisterGoogleUser(googleProfile) {
  let user = await User.findOne({ googleId: googleProfile.sub });
  
  if (!user) {
    user = await User.findOne({ email: googleProfile.email.toLowerCase() });
    if (user) {
      user.googleId = googleProfile.sub;
      if (!user.emailVerifiedAt) {
        user.emailVerifiedAt = new Date();
      }
      await user.save();
    } else {
      const workspace = await Workspace.create({
        name: `${googleProfile.name}'s Workspace`,
        slug: `workspace-${Date.now()}-${nanoid(4)}`,
        plan: "free",
      });

      user = await User.create({
        email: googleProfile.email.toLowerCase(),
        name: googleProfile.name,
        googleId: googleProfile.sub,
        roles: ["admin"],
        workspaceIds: [workspace._id],
        workspaceRoles: [
          {
            workspaceId: workspace._id,
            role: "admin",
          }
        ],
        emailVerifiedAt: new Date(),
      });

      workspace.ownerId = user._id;
      await workspace.save();
    }
  }

  user.lastLoginAt = new Date();
  await user.save();
  return await buildSession(user);
}

export async function linkGoogleAccount(userId, googleProfile) {
  const existingLink = await User.findOne({ googleId: googleProfile.sub });
  if (existingLink && existingLink._id.toString() !== userId.toString()) {
    throw new ApiError(400, "This Google account is already linked to another user.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  user.googleId = googleProfile.sub;
  if (!user.emailVerifiedAt) {
    user.emailVerifiedAt = new Date();
  }
  await user.save();
  return user;
}
