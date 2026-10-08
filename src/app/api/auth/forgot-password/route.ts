import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users, passwordResetTokens } from "@/server/db/schema";
import { withErrorHandling } from "@/server/api/helpers";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const { email } = schema.parse(await req.json());
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));

    // Always respond the same way to avoid leaking which emails are registered.
    if (!user) return { ok: true };

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

    // In production this would be emailed via the configured EMAIL provider.
    // Returned here only so the flow is demonstrable without email infra.
    return { ok: true, devResetToken: process.env.NODE_ENV !== "production" ? token : undefined };
  });
}
