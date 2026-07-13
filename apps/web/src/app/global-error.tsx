"use client";

interface GlobalErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function GlobalErrorPage({ reset }: GlobalErrorPageProps) {
  return (
    <html lang="vi">
      <body>
        <main
          style={{
            alignItems: "center",
            background: "#071019",
            color: "#e5edf5",
            display: "flex",
            fontFamily: "system-ui, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
          }}
        >
          <section style={{ maxWidth: "36rem" }}>
            <p style={{ color: "#fda4af", fontWeight: 700 }}>AUTOBRACKET</p>
            <h1>Ứng dụng gặp lỗi ngoài dự kiến.</h1>
            <p role="alert">Chi tiết nội bộ đã được ẩn. Bạn có thể thử tải lại ứng dụng.</p>
            <button onClick={reset} type="button">
              Tải lại
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
