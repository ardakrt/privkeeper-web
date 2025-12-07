import { Suspense } from "react";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { redirect } from "next/navigation";

export default async function UpdatePasswordPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const code = searchParams.code as string | undefined;

  if (code) {
    // Redirect to callback to handle code exchange and cookie setting securely
    redirect(`/auth/callback?code=${code}&next=/auth/update-password`);
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black flex items-center justify-center p-4">
      <Suspense fallback={<div className="min-h-screen w-full bg-white dark:bg-black" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}