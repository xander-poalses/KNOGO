export function accountError(cause: unknown, mode: "signin" | "signup"): string {
  const error = cause as { status?: number; code?: string } | null;
  if (error?.code === "over_email_send_rate_limit") return "Email limit reached. Wait before trying again.";
  if (error?.status === 429) return "Too many attempts. Wait before trying again.";
  if (error?.code === "email_not_confirmed") return "Confirm your email, then sign in.";
  if (error?.code === "email_address_invalid") return "Check your email address for a typo.";
  if (error?.code === "email_address_not_authorized") return "Email signup is not available for this address yet.";
  if (error?.code === "weak_password") return "Choose a password with at least 8 characters.";
  if (error?.code === "invalid_credentials") return "Check your email and password, then try again.";
  return mode === "signin" ? "Check your connection, then try signing in again." : "Check your connection, then try creating your account again.";
}
