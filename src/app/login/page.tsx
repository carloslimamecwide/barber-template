import type { Metadata } from "next";
import { LoginForm } from "@/components/login/login-form";

export const metadata: Metadata = {
  title: "Entrar — Barbearia Nobre",
};

export default function LoginPage() {
  return <LoginForm />;
}
