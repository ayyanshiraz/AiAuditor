/**
 * Bootstraps (or promotes) the platform owner — the one account with
 * full creator access across every admin, company and user. Run this
 * once per environment (locally and again against your production
 * database) with your own credentials:
 *
 *   SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='something-strong' SUPERADMIN_NAME="Your Name" npm run db:seed-superadmin
 *
 * Safe to re-run: if the email already exists it is simply promoted
 * (and its password updated, if you pass one), nothing else is touched.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";
import { hashPassword } from "@/server/auth/password";

async function main() {
  const email = process.env.SUPERADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME ?? "Platform Owner";

  if (!email || !password) {
    console.error(
      "Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD environment variables and re-run.\n" +
        "Example: SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='something-strong' npm run db:seed-superadmin"
    );
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Use a password with at least 12 characters for the platform owner account.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(users).where(eq(users.email, email));

  if (existing) {
    await db
      .update(users)
      .set({ isSuperAdmin: true, passwordHash, name, disabledAt: null, updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    console.log(`Promoted existing account ${email} to platform owner.`);
  } else {
    await db.insert(users).values({ name, email, passwordHash, isSuperAdmin: true });
    console.log(`Created platform owner account ${email}.`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
