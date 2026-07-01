import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    roles: [{ type: String, enum: ["super-admin", "admin", "engineer", "viewer"] }],
    workspaceRoles: [
      {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
        role: { type: String, enum: ["super-admin", "admin", "engineer", "viewer"], required: true },
      },
    ],
    workspaceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Workspace" }],
    emailVerifiedAt: Date,
    lastLoginAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
