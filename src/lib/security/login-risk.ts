export function assessLoginRisk(input: {
  trusted: boolean;
  recentFailures: number;
  recentSuccesses: number;
  ipChanged: boolean;
  userAgentChanged: boolean;
}) {
  const reasons: string[] = [];
  if (!input.trusted) reasons.push("new_device");
  if (input.recentFailures >= 2) reasons.push("repeated_failure");
  if (input.recentSuccesses >= 5) reasons.push("login_frequency");
  if (input.trusted && input.ipChanged) reasons.push("ip_change");
  if (input.trusted && input.userAgentChanged) reasons.push("user_agent_change");
  return reasons;
}
