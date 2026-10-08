export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, var(--primary-soft), transparent), var(--background)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-[var(--primary-foreground)]"
            style={{ boxShadow: "var(--shadow-elevated)" }}
          >
            L
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ledgerly</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Accounting &amp; audit management</p>
        </div>
        {children}
      </div>
    </div>
  );
}
