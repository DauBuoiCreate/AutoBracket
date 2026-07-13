import Link from "next/link";

const foundations = [
  "pnpm workspace đã khóa phiên bản",
  "TypeScript strict xuyên suốt monorepo",
  "Health contract chung cho ba process",
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16 sm:px-10">
      <section className="grid w-full gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
        <div>
          <p className="mb-5 text-sm font-semibold tracking-[0.22em] text-emerald-300 uppercase">
            P0 · Nền móng đang hoạt động
          </p>
          <h1 className="max-w-4xl text-5xl leading-[0.96] font-semibold tracking-[-0.055em] text-balance sm:text-7xl">
            Tổ chức giải đấu rõ ràng từ lần bốc thăm đầu tiên.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            AutoBracket đang được xây dựng theo kế hoạch đã khóa: dữ liệu có phiên bản, thao tác có
            audit và mọi kết quả chia bảng đều có thể tái lập.
          </p>
          <Link
            className="mt-9 inline-flex min-h-11 items-center rounded-full bg-emerald-300 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
            href="/health"
          >
            Kiểm tra health
          </Link>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-sm font-medium text-slate-400">P0-01</p>
          <h2 className="mt-2 text-2xl font-semibold">Bootstrap có thể kiểm chứng</h2>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
            {foundations.map((foundation) => (
              <li className="flex gap-3" key={foundation}>
                <span
                  aria-hidden="true"
                  className="mt-2 size-2 shrink-0 rounded-full bg-emerald-300"
                />
                <span>{foundation}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
