import { RegisterForm } from "@/components/register-form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const user = await getSession();
  if (user) redirect("/");

  return <RegisterForm />;
}
