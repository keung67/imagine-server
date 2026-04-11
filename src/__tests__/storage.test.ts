import { describe, it, expect, vi, afterEach } from "vitest";
import { createAutoStorage } from "../storage";

// Mock log to avoid polluting test output
const consoleMock = vi.spyOn(console, "log").mockImplementation(() => {});

describe("Storage", () => {
  afterEach(() => {
    consoleMock.mockClear();
  });

  it("should prioritize Upstash Redis when KV_REST_API_URL and KV_REST_API_TOKEN exist", () => {
    const env = {
      KV_REST_API_URL: "https://upstash-url",
      KV_REST_API_TOKEN: "upstash-token",
      REDIS_URL: "redis://localhost", // Should be ignored
      TOKEN_STATUS_KV: "kv-binding", // Should be ignored
    };
    const storage = createAutoStorage(env);
    expect(storage).toBeDefined();
    expect(consoleMock).toHaveBeenCalledWith("[Storage] Using Upstash Redis (Vercel KV)");
  });

  it("should use Standard Redis when REDIS_URL exists (and no Upstash env)", () => {
    const env = {
      REDIS_URL: "redis://localhost:6379",
      TOKEN_STATUS_KV: "kv-binding", // Should be ignored
    };
    const storage = createAutoStorage(env);
    expect(storage).toBeDefined();
    expect(consoleMock).toHaveBeenCalledWith("[Storage] Using Redis");
  });

  it("should use Cloudflare KV when TOKEN_STATUS_KV exists (and no Redis env)", () => {
    const env = {
      TOKEN_STATUS_KV: "kv-binding-object",
    };
    const storage = createAutoStorage(env);
    expect(storage).toBeDefined();
    expect(consoleMock).toHaveBeenCalledWith("[Storage] Using Cloudflare KV");
  });

  it("should fallback to memory storage when no specific env variables are present", () => {
    const env = {};
    const storage = createAutoStorage(env);
    expect(storage).toBeDefined();
    expect(consoleMock).toHaveBeenCalledWith("[Storage] Using memory storage (development mode)");
  });
});
