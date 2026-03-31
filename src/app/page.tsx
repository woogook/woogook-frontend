import Link from "next/link";

const serviceCards = [
  {
    href: "/assembly",
    label: "국회 서비스",
    title: "우리동네 국회의원 안내서",
    description: "국회 도메인 화면과 문서는 이 경로 아래에서 독립적으로 확장합니다.",
  },
  {
    href: "/local-election",
    label: "지방선거 서비스",
    title: "내 선거 안내서",
    description: "주소 기반 투표지 확인과 후보 비교 흐름은 지방선거 도메인으로 유지합니다.",
  },
];

export default function Home() {
  return (
    <main
      className="min-h-screen px-6 py-16"
      style={{
        background:
          "radial-gradient(circle at top, rgba(191,219,254,0.32), transparent 34%), var(--background)",
      }}
    >
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold tracking-[0.18em]" style={{ color: "var(--text-secondary)" }}>
          WOOGOOK FRONTEND
        </p>
        <h1
          className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl"
          style={{ color: "var(--navy)", fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif" }}
        >
          국회와 지방선거 서비스를
          <br />
          서로 다른 경계로 안내합니다.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "var(--text-secondary)" }}>
          루트 페이지는 서비스 선택만 담당합니다. 실제 화면과 문서는 각 도메인 경로에서 독립적으로
          발전합니다.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {serviceCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-[28px] border p-6 transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--amber)" }}>
                {card.label}
              </p>
              <h2 className="mt-3 text-2xl font-bold" style={{ color: "var(--navy)" }}>
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
