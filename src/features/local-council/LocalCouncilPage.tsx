"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  fetchLocalCouncilPerson,
  fetchLocalCouncilResolve,
  type LocalCouncilResult,
} from "@/lib/api-client";
import type {
  LocalCouncilPersonDossierResponse,
  LocalCouncilResolveResponse,
  LocalCouncilRosterPerson,
} from "@/lib/schemas";
import LocalCouncilAddressStep from "@/features/local-council/components/LocalCouncilAddressStep";
import LocalCouncilPersonDetailView from "@/features/local-council/components/LocalCouncilPersonDetailView";
import LocalCouncilRosterView from "@/features/local-council/components/LocalCouncilRosterView";

type View = "address" | "roster" | "detail";

export default function LocalCouncilPage() {
  const [view, setView] = useState<View>("address");
  const [resolveResult, setResolveResult] =
    useState<LocalCouncilResult<LocalCouncilResolveResponse> | null>(null);
  const [personResult, setPersonResult] =
    useState<LocalCouncilResult<LocalCouncilPersonDossierResponse> | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const rootStyle: CSSProperties = {
    background: "var(--background)",
    ["--nav-height" as string]: "60px",
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [view]);

  const navigate = (nextView: View) => {
    setView(nextView);
    window.history.pushState({ view: nextView }, "");
  };

  useEffect(() => {
    window.history.replaceState({ view: "address" }, "");
    const handlePopState = (event: PopStateEvent) => {
      const targetView = event.state?.view as View | undefined;
      setView(targetView || "address");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleAddressSubmit = async (city: string, district: string, dong: string) => {
    setLoading(true);
    setError(null);
    setDetailError(null);
    setResolveResult(null);
    setPersonResult(null);

    try {
      const result = await fetchLocalCouncilResolve({ city, district, dong });
      setResolveResult(result);
      navigate("roster");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "현직자 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPerson = async (person: LocalCouncilRosterPerson) => {
    setDetailLoading(true);
    setDetailError(null);
    setPersonResult(null);

    try {
      const result = await fetchLocalCouncilPerson(person.person_key);
      setPersonResult(result);
      navigate("detail");
    } catch (err) {
      console.error(err);
      setDetailError(
        err instanceof Error ? err.message : "선택한 인물 정보를 찾지 못했습니다.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col" style={rootStyle}>
      <div
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(249,248,245,0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div
          className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5"
          style={{ height: "var(--nav-height)" }}
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight" style={{ color: "var(--navy)" }}>
              우리동네 지방의원
            </p>
            <p
              className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-snug"
              style={{ color: "var(--text-secondary)" }}
            >
              현직 지방의원 서비스
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <Link href="/" className="rounded-lg border px-3 py-1.5" style={{ borderColor: "var(--border)" }}>
              서비스 허브
            </Link>
            <Link
              href="/local-election"
              className="rounded-lg border px-3 py-1.5"
              style={{ borderColor: "var(--border)" }}
            >
              지방선거
            </Link>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {view === "address" && (
          <LocalCouncilAddressStep
            onSubmit={handleAddressSubmit}
            loading={loading}
            error={error}
          />
        )}
        {view === "roster" && resolveResult && (
          <>
            <LocalCouncilRosterView
              resolveData={resolveResult.data}
              dataSource={resolveResult.dataSource}
              onSelectPerson={handleSelectPerson}
              onBack={() => navigate("address")}
            />
            {detailLoading && (
              <p
                className="mx-auto max-w-5xl px-5 pb-8 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                인물 정보를 불러오는 중입니다.
              </p>
            )}
            {detailError && (
              <p
                className="mx-auto max-w-5xl px-5 pb-8 text-sm"
                style={{ color: "var(--warning-text)" }}
              >
                {detailError}
              </p>
            )}
          </>
        )}
        {view === "detail" && personResult && (
          <LocalCouncilPersonDetailView
            person={personResult.data}
            dataSource={personResult.dataSource}
            onBack={() => navigate("roster")}
          />
        )}
      </div>
    </div>
  );
}
