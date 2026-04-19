import Link from "next/link";

const serviceCards = [
  {
    href: "/assembly",
    label: "국회 서비스",
    title: "우리동네 국회의원 안내서",
    description: "지역구 국회의원 정보와 공약·이행 현황을 단계별로 살펴볼 수 있습니다.",
  },
  {
    href: "/local-election",
    label: "지방선거 서비스",
    title: "내 선거 안내서",
    description: "주소로 투표지를 확인하고, 후보를 비교하며 선거 안내를 이어갈 수 있습니다.",
  },
  {
    href: "/local-council",
    label: "현직 지방의원",
    title: "우리동네 지방의원",
    description: "주소를 입력하면 구청장·구의원 정보와 공개 자료 기반 요약을 확인할 수 있습니다.",
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
          WOOGOOK SERVICE
        </p>
        <h1
          className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl"
          style={{ color: "var(--navy)", fontFamily: "var(--font-noto-serif), 'Noto Serif KR', serif" }}
        >
          국회부터 우리 동네까지,
          <br />
          필요한 정치 정보를 안내합니다.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7" style={{ color: "var(--text-secondary)" }}>
          국회의원, 지방선거, 현직 지방의원 안내를 주제별 화면으로 나누었습니다. 아래에서 보고 싶은
          주제를 골라 이동하면 됩니다.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
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
