"use client";

import { useEffect } from "react";
import { call } from "@/lib/api";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  // Already signed in? Go straight to the app.
  useEffect(() => {
    call("me").then(() => location.replace("/"), () => {});
  }, []);
  return <LoginForm />;
}
