import { StudentPasswordRecoveryForm } from "@/components/platform/StudentPasswordRecoveryForm";

export const metadata = {
  title: "Recover Password",
};

export default function StudentRecoverPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#e7eefc] dark:bg-[#0b0f14]">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-8">
          <div className="space-y-1">
            <div className="text-lg font-extrabold tracking-tight text-black dark:text-white">Reset password</div>
            <div className="text-sm text-black/70 dark:text-white/70">Enter the recovery email you added during sign up.</div>
          </div>
          <div className="mt-6">
            <StudentPasswordRecoveryForm />
          </div>
        </div>
      </div>
    </div>
  );
}
