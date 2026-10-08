"use client";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SuperAdminSignOut() {
  return (
    <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
      <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
    </Button>
  );
}
