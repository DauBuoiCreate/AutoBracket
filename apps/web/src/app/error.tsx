"use client";

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
      <section className="w-full rounded-3xl border border-rose-300/20 bg-rose-300/[0.06] p-8 sm:p-12">
        <p className="font-semibold tracking-wider text-rose-200 uppercase">Có lỗi xảy ra</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Trang này chưa thể tải hoàn chỉnh.
        </h1>
        <p className="mt-4 leading-7 text-slate-300" role="alert">
          Vui lòng thử lại. Nếu lỗi tiếp diễn, mã tương quan trong response sẽ giúp đội vận hành tra
          cứu mà không hiển thị chi tiết nội bộ.
        </p>
        <button
          className="mt-8 min-h-11 rounded-full bg-rose-200 px-6 py-3 font-semibold text-slate-950"
          onClick={reset}
          type="button"
        >
          Thử lại
        </button>
      </section>
    </main>
  );
}
