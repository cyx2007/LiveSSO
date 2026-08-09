import { describe, expect, it } from "vitest";
import { digestMatches, digestSensitiveValue } from "./digest";

const secret = "test-only-secret-with-at-least-thirty-two-characters";

describe("sensitive value digests", () => {
  it("is deterministic within one purpose and separates different purposes", () => {
    const invitation = digestSensitiveValue("invitation-token", "same-value", secret);
    const invitationAgain = digestSensitiveValue("invitation-token", "same-value", secret);
    const device = digestSensitiveValue("trusted-device-token", "same-value", secret);

    expect(invitation).toBe(invitationAgain);
    expect(invitation).not.toBe(device);
    expect(invitation).toMatch(/^h1:[a-f0-9]{64}$/);
    expect(invitation).not.toContain("same-value");
  });

  it("compares a candidate without exposing or storing its cleartext", () => {
    const digest = digestSensitiveValue("login-otp", "482193", secret);

    expect(digestMatches("482193", digest, "login-otp", secret)).toBe(true);
    expect(digestMatches("482194", digest, "login-otp", secret)).toBe(false);
  });

  it("rejects empty values and weak secrets", () => {
    expect(() => digestSensitiveValue("login-otp", "", secret)).toThrow(/empty/i);
    expect(() => digestSensitiveValue("login-otp", "123456", "too-short")).toThrow(/32/);
  });
});
