"use client";

import { useEffect } from "react";
import { call } from "@/lib/api";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  // Already signed in? Go straight to the app.
  useEffect(() => {
    call("me").then(() => location.replace("/"), () => {});
  }, []);
  return <RegisterForm />;
}
