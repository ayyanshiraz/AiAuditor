import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";

export default async function Home() {
  const session = await auth();
  redirect(session?.user ? "/companies" : "/login");
}
