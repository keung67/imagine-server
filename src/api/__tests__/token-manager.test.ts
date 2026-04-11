import { describe, it, expect } from "vitest";
import { runWithTokenRetry } from "../token-manager";
import type { Bindings } from "../../types";

describe("runWithTokenRetry", () => {
  it("should succeed on first try if no quota error", async () => {
    const env: Bindings = {
      GITEE_TOKENS: "token1, token2",
    };

    let callCount = 0;
    const result = await runWithTokenRetry("gitee", env, async (token) => {
      callCount++;
      return `success-${token}`;
    });

    expect(callCount).toBe(1);
    expect(["success-token1", "success-token2"]).toContain(result);
  });

  it("should retry if quota error occurs (429)", async () => {
    const env: Bindings = {
      GITEE_TOKENS: "token1, token2",
    };

    let callCount = 0;
    const result = await runWithTokenRetry("gitee", env, async (token) => {
      callCount++;
      if (callCount === 1) {
        const err = new Error("quota exceeded");
        (err as any).status = 429;
        throw err;
      }
      return `success-${token}`;
    });

    expect(callCount).toBe(2);
    // Since it failed once, it should have tried the other token and returned success
    expect(result).toMatch(/success-token/);
  });

  it("should fail if all tokens give quota errors", async () => {
    const env: Bindings = {
      GITEE_TOKENS: "token1, token2",
    };

    let callCount = 0;
    const promise = runWithTokenRetry("gitee", env, async (token) => {
      callCount++;
      const err = new Error("quota limit");
      (err as any).status = 429;
      throw err;
    });

    await expect(promise).rejects.toThrow("quota limit");
    // Attempts will be at most maxAttempts, which is tokens.length + 1 -> 3
    expect(callCount).toBe(3);
  });

  it("should immediately throw on AbortError", async () => {
    const env: Bindings = {
      GITEE_TOKENS: "token1, token2",
    };

    let callCount = 0;
    const promise = runWithTokenRetry("gitee", env, async () => {
      callCount++;
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });

    await expect(promise).rejects.toThrow("aborted");
    expect(callCount).toBe(1);
  });

  it("should throw token required error if no tokens and provider not huggingface", async () => {
    const env: Bindings = {};
    const promise = runWithTokenRetry("gitee", env, async () => "ok");
    await expect(promise).rejects.toThrow("error_gitee_token_required");
  });

  it("should proceed without token for huggingface if no tokens provided", async () => {
    const env: Bindings = {};
    const result = await runWithTokenRetry(
      "huggingface",
      env,
      async (token) => {
        return token === null ? "public-access" : "auth-access";
      },
    );
    expect(result).toBe("public-access");
  });
});
