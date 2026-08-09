import { describe, expect, it } from "vitest";
import { assessLoginRisk } from "./security/login-risk";

describe("Phase 3 login risk paths", () => {
  it("allows the normal path for a stable trusted device", () => {
    expect(assessLoginRisk({
      trusted: true,
      recentFailures: 0,
      recentSuccesses: 1,
      ipChanged: false,
      userAgentChanged: false,
    })).toEqual([]);
  });

  it("requires a challenge for a new device", () => {
    expect(assessLoginRisk({
      trusted: false,
      recentFailures: 0,
      recentSuccesses: 0,
      ipChanged: false,
      userAgentChanged: false,
    })).toContain("new_device");
  });

  it("combines explainable failure, frequency and context rules", () => {
    expect(assessLoginRisk({
      trusted: true,
      recentFailures: 2,
      recentSuccesses: 5,
      ipChanged: true,
      userAgentChanged: true,
    })).toEqual(["repeated_failure", "login_frequency", "ip_change", "user_agent_change"]);
  });
});
