import Link from "next/link";

export default function HealthPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.06] p-8 sm:p-12">
        <div className="flex items-center gap-3 text-emerald-200">
          <span
            aria-hidden="true"
            className="size-3 rounded-full bg-emerald-300 shadow-[0_0_24px_#72f6c1]"
          />
          <p className="font-semibold tracking-wider uppercase">Operational</p>
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Web process đang hoạt động.</h1>
        <p className="mt-4 leading-7 text-slate-300">
          Liveness có tại <code>/api/health</code>; readiness PostgreSQL và Redis có tại{" "}
          <code>/api/ready</code>.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            className="font-semibold text-emerald-200 underline underline-offset-4"
            href="/api/health"
          >
            Mở health JSON
          </a>
          <a className="font-semibold text-cyan-200 underline underline-offset-4" href="/api/ready">
            Mở readiness JSON
          </a>
          <Link className="text-slate-300 underline underline-offset-4" href="/">
            Về trang đầu
          </Link>
        </div>
      </section>
    </main>
  );
}
