import bcrypt from "bcryptjs";
import { connectDb } from "../config/db.js";
import { User, Workspace } from "../models/index.js";

async function run() {
  await connectDb();

  const workspace = await Workspace.findOne({ slug: "acme-infra" });
  if (!workspace) {
    console.error("Acme Infra workspace not found. Please ensure the seed script has run.");
    process.exit(1);
  }

  // Delete existing viewer if present
  await User.deleteOne({ email: "viewer@acme.io" });

  const viewer = await User.create({
    email: "viewer@acme.io",
    passwordHash: await bcrypt.hash("Password123!", 12),
    name: "Vince Viewer",
    roles: ["viewer"],
    workspaceIds: [workspace._id],
    workspaceRoles: [
      {
        workspaceId: workspace._id,
        role: "viewer",
      }
    ],
  });

  console.log("Viewer user created successfully:", viewer.email);
  process.exit(0);
}

run().catch(console.error);
