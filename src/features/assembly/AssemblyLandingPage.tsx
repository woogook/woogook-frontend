import Link from "next/link";

const sections = [
  {
    label: "도메인 경계",
    title: "국회 화면은 `/assembly` 아래에서만 확장",
    description: "국회팀은 이 경로와 `src/features/assembly`, `docs/assembly`를 기준으로 작업합니다.",
  },
  {
    label: "작업 문서",
    title: "온보딩과 workflow를 함께 분리",
    description: "루트 `AGENTS.md`와 `docs/assembly`가 국회팀의 시작점이 됩니다.",
  },
];

export function AssemblyLandingPage() {
  return (
    <main
      className="min-h-screen px-6 py-16"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(2,132,199,0.14), transparent 30%), var(--background)",
      }}
    >
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold tracking-[0.18em]" style={{ color: "var(--text-secondary)" }}>
          ASSEMBLY DOMAIN
        </p>
        <h1
          className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl"
          style={{ color: "var(--navy)", fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif" }}
        >
          우리동네 국회의원 안내서
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "var(--text-secondary)" }}>
          국회 서비스는 별도 URL, 별도 문서, 별도 작업 경계를 기준으로 확장합니다. 현재 단계에서는
          진입 구조와 운영 기준을 먼저 분리합니다.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[28px] border p-6"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--amber)" }}>
                {section.label}
              </p>
              <h2 className="mt-3 text-2xl font-bold" style={{ color: "var(--navy)" }}>
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                {section.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="rounded-full border px-4 py-2" style={{ borderColor: "var(--border)" }}>
            서비스 허브로 돌아가기
          </Link>
          <Link
            href="/local-election"
            className="rounded-full border px-4 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            지방선거 서비스 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
