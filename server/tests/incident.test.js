import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  Workspace,
  Service,
  Metric,
  LogEntry,
  CheckResult,
  AlertRule,
  Alert,
  Incident,
  ServiceDependency,
  Team,
  User,
  WorkspaceMember
} from "../src/models/index.js";
import { signAccessToken } from "../src/utils/tokens.js";
import crypto from "crypto";

let mongoServer;
let app;
let server;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
  process.env.JWT_ACCESS_SECRET = "test-secret";
  process.env.JWT_ACCESS_TTL = "15m";
  
  await mongoose.connect(uri);
  
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe("Cascading Cleanup on Service Deletion", () => {
  it("should delete all related records when a service is deleted", async () => {
    const user = await User.create({
      email: "test@example.com",
      passwordHash: "hash",
      name: "Test User"
    });
    
    const workspace = await Workspace.create({ name: "Test Workspace" });
    
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: user._id,
      role: "admin"
    });
    
    const service = await Service.create({
      workspaceId: workspace._id,
      name: "Test Service",
    });

    const otherService = await Service.create({
      workspaceId: workspace._id,
      name: "Other Service",
    });
    
    await Metric.create({ workspaceId: workspace._id, serviceId: service._id, name: "cpu", value: 50 });
    await LogEntry.create({ workspaceId: workspace._id, serviceId: service._id, message: "test log", severity: "info" });
    await CheckResult.create({ serviceId: service._id, ok: true, durationMs: 100 });
    const rule = await AlertRule.create({ workspaceId: workspace._id, serviceId: service._id, name: "rule", type: "uptime", threshold: 99 });
    await Alert.create({ workspaceId: workspace._id, serviceId: service._id, ruleId: rule._id, title: "alert", dedupeKey: "key" });
    await Incident.create({ workspaceId: workspace._id, serviceId: service._id, title: "incident", severity: "high" });
    await ServiceDependency.create({ workspaceId: workspace._id, serviceId: service._id, dependsOnServiceId: otherService._id });
    
    // Verify records exist
    expect(await Metric.countDocuments({ serviceId: service._id })).toBe(1);
    expect(await LogEntry.countDocuments({ serviceId: service._id })).toBe(1);
    expect(await CheckResult.countDocuments({ serviceId: service._id })).toBe(1);
    expect(await AlertRule.countDocuments({ serviceId: service._id })).toBe(1);
    expect(await Alert.countDocuments({ serviceId: service._id })).toBe(1);
    expect(await Incident.countDocuments({ serviceId: service._id })).toBe(1);
    expect(await ServiceDependency.countDocuments({ serviceId: service._id })).toBe(1);
    
    const token = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      workspaceIds: [workspace._id.toString()]
    });
    
    const res = await request(app)
      .delete(`/api/services/${service._id}`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-workspace-id", workspace._id.toString());
      
    expect(res.status).toBe(200);
    
    // Verify records are deleted
    expect(await Metric.countDocuments({ serviceId: service._id })).toBe(0);
    expect(await LogEntry.countDocuments({ serviceId: service._id })).toBe(0);
    expect(await CheckResult.countDocuments({ serviceId: service._id })).toBe(0);
    expect(await AlertRule.countDocuments({ serviceId: service._id })).toBe(0);
    expect(await Alert.countDocuments({ serviceId: service._id })).toBe(0);
    expect(await Incident.countDocuments({ serviceId: service._id })).toBe(0);
    expect(await ServiceDependency.countDocuments({ serviceId: service._id })).toBe(0);
  });
});
