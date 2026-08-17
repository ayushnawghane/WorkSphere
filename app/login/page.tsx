import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Sign in — WorkSphere Attendance",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
