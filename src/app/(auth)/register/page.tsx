import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration is invite-only</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 py-4 text-center">
        <ShieldCheck className="h-10 w-10 text-[var(--primary)]" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Ledgerly accounts are created by your administrator or by the platform owner — there is no self-service
          sign-up. If you were expecting access, ask your company&apos;s admin to add you, or contact the platform
          owner directly.
        </p>
        <Link href="/login" className="mt-2 text-sm font-medium text-[var(--primary)] hover:underline">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
