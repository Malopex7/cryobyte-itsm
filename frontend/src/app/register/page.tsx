/**
 * REGISTRATION PAGE — PUBLIC ACCESS DISABLED
 *
 * User accounts are created exclusively by Admins via the Admin Panel (/admin).
 * This file is kept in the repository to preserve git history but the page
 * itself redirects immediately to /login.
 *
 * Original form implementation: see git history / howto-admin.md
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Registration is admin-only. Redirect public visitors to login.
    router.replace("/login");
  }, [router]);

  // Render nothing while redirecting
  return null;
}
