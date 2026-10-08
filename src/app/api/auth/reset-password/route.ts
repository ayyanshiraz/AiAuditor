import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { users, passwordResetTokens } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { withErrorHandling } from "@/server/api/helpers";
import { ValidationError } from "@/lib/errors";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const { token, password } = schema.parse(await req.json());

    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), isNull(passwordResetTokens.usedAt)));

    if (!row || row.expiresAt < new Date()) {
      throw new ValidationError("This password reset link is invalid or has expired.");
    }

    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, row.userId));
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, row.id));

    return { ok: true };
  });
}
