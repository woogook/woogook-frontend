"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  fetchLocalCouncilPerson,
  fetchLocalCouncilRoster,
  fetchLocalCouncilResolve,
  mergeLocalCouncilDataSources,
  type LocalCouncilResult,
} from "@/lib/api-client";
import type {
  LocalCouncilPersonDossierResponse,
  LocalCouncilRosterScreenData,
  LocalCouncilRosterPerson,
} from "@/lib/schemas";
import { isLocalCouncilRosterPerson } from "@/features/local-council/data";
import LocalCouncilAddressStep from "@/features/local-council/components/LocalCouncilAddressStep";
import LocalCouncilPersonDetailView from "@/features/local-council/components/LocalCouncilPersonDetailView";
import LocalCouncilRosterView from "@/features/local-council/components/LocalCouncilRosterView";

type View = "address" | "roster" | "detail";
type LocalCouncilHistoryState = {
  view?: View;
  personKey?: string;
};

function isView(value: unknown): value is View {
  return value === "address" || value === "roster" || value === "detail";
}

function getHistoryState(value: unknown): LocalCouncilHistoryState {
  if (!value || typeof value !== "object") {
    return {};
  }

  const record = value as Record<string, unknown>;
  return {
    view: isView(record.view) ? record.view : undefined,
    personKey:
      typeof record.personKey === "string" && record.personKey.trim()
        ? record.personKey
        : undefined,
  };
}

function getFallbackView(hasRosterResult: boolean): View {
  return hasRosterResult ? "roster" : "address";
}

function createHistoryState(view: View, personKey?: string): LocalCouncilHistoryState {
  return { view, personKey };
}

function buildBrowserHistoryState(localState: LocalCouncilHistoryState) {
  const current = window.history.state;
  if (current && typeof current === "object") {
    return { ...current, ...localState };
  }
  return localState;
}

function hasViewState(state: LocalCouncilHistoryState) {
  return state.view === "address" || state.view === "roster" || state.view === "detail";
}

function findSelectedRosterPerson(
  result: LocalCouncilResult<LocalCouncilRosterScreenData> | null,
  personKey: string | null,
) {
  if (!result || !personKey) {
    return null;
  }

  const districtHead = result.data.roster.district_head;
  if (isLocalCouncilRosterPerson(districtHead) && districtHead.person_key === personKey) {
    return districtHead;
  }

  return (
    result.data.roster.council_members.find((member) => member.person_key === personKey) ||
    null
  );
}

export default function LocalCouncilPage() {
  const [view, setView] = useState<View>("address");
  const [rosterScreenResult, setRosterScreenResult] =
    useState<LocalCouncilResult<LocalCouncilRosterScreenData> | null>(null);
  const [personResult, setPersonResult] =
    useState<LocalCouncilResult<LocalCouncilPersonDossierResponse> | null>(null);
  const [selectedPersonKey, setSelectedPersonKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const viewRef = useRef<View>("address");
  const rosterScreenResultRef =
    useRef<LocalCouncilResult<LocalCouncilRosterScreenData> | null>(null);
  const personResultRef =
    useRef<LocalCouncilResult<LocalCouncilPersonDossierResponse> | null>(null);
  const selectedPersonKeyRef = useRef<string | null>(null);
  const resolveRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const selectedRosterPerson = findSelectedRosterPerson(
    rosterScreenResult,
    selectedPersonKey,
  );

  const rootStyle: CSSProperties = {
    background: "var(--background)",
    ["--nav-height" as string]: "60px",
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    rosterScreenResultRef.current = rosterScreenResult;
  }, [rosterScreenResult]);

  useEffect(() => {
    personResultRef.current = personResult;
  }, [personResult]);

  useEffect(() => {
    selectedPersonKeyRef.current = selectedPersonKey;
  }, [selectedPersonKey]);

  const cancelDetailRequest = () => {
    detailRequestIdRef.current += 1;
    setDetailLoading(false);
  };

  const cancelResolveRequest = () => {
    resolveRequestIdRef.current += 1;
    setLoading(false);
  };

  const updateViewOnly = (nextView: View) => {
    viewRef.current = nextView;
    setView(nextView);
  };

  const pushView = (nextView: View, historyState?: LocalCouncilHistoryState) => {
    viewRef.current = nextView;
    setView(nextView);
    window.history.pushState(
      buildBrowserHistoryState(historyState ?? createHistoryState(nextView)),
      "",
    );
  };

  const replaceView = (nextView: View, historyState?: LocalCouncilHistoryState) => {
    viewRef.current = nextView;
    setView(nextView);
    window.history.replaceState(
      buildBrowserHistoryState(historyState ?? createHistoryState(nextView)),
      "",
    );
  };

  useEffect(() => {
    const reconcileHistoryState = (rawState: unknown) => {
      const historyState = getHistoryState(rawState);
      const hasRosterResult = Boolean(rosterScreenResultRef.current);
      const hasPersonResult = Boolean(personResultRef.current);
      const requestedView = historyState.view || "address";

      if (requestedView === "detail") {
        const currentPersonKey = selectedPersonKeyRef.current;
        const matchingPersonResult = hasPersonResult && Boolean(currentPersonKey);
        const matchesHistoryKey =
          historyState.personKey && currentPersonKey
            ? historyState.personKey === currentPersonKey
            : Boolean(currentPersonKey);

        if (matchingPersonResult && matchesHistoryKey) {
          updateViewOnly("detail");
          return;
        }

        const fallbackView = getFallbackView(hasRosterResult);
        cancelDetailRequest();
        setDetailError(null);
        if (fallbackView === "address") {
          updateViewOnly("address");
        } else {
          updateViewOnly("roster");
        }
        replaceView(fallbackView, createHistoryState(fallbackView));
        return;
      }

      if (requestedView === "roster") {
        if (hasRosterResult) {
          cancelDetailRequest();
          updateViewOnly("roster");
          return;
        }

        cancelDetailRequest();
        replaceView("address", createHistoryState("address"));
        return;
      }

      cancelDetailRequest();
      updateViewOnly("address");
    };

    if (!getHistoryState(window.history.state).view) {
      window.history.replaceState(
        buildBrowserHistoryState(createHistoryState("address")),
        "",
      );
    }
    reconcileHistoryState(window.history.state);

    const handlePopState = (event: PopStateEvent) => {
      reconcileHistoryState(event.state);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleAddressSubmit = async (city: string, district: string, dong: string) => {
    const requestId = ++resolveRequestIdRef.current;
    cancelDetailRequest();
    setLoading(true);
    setError(null);
    setDetailError(null);
    setRosterScreenResult(null);
    setPersonResult(null);
    setSelectedPersonKey(null);
    rosterScreenResultRef.current = null;
    personResultRef.current = null;
    selectedPersonKeyRef.current = null;

    try {
      const resolved = await fetchLocalCouncilResolve({ city, district, dong });
      const roster = await fetchLocalCouncilRoster(resolved.data.district.gu_code);
      if (requestId !== resolveRequestIdRef.current || viewRef.current !== "address") {
        return;
      }
      const result = {
        data: {
          district: resolved.data.district,
          roster: roster.data,
        },
        dataSource: mergeLocalCouncilDataSources(
          resolved.dataSource,
          roster.dataSource,
        ),
      } satisfies LocalCouncilResult<LocalCouncilRosterScreenData>;
      setRosterScreenResult(result);
      rosterScreenResultRef.current = result;
      pushView("roster", createHistoryState("roster"));
    } catch (err) {
      if (requestId !== resolveRequestIdRef.current || viewRef.current !== "address") {
        return;
      }
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "현직자 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      if (requestId === resolveRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSelectPerson = async (person: LocalCouncilRosterPerson) => {
    const requestId = ++detailRequestIdRef.current;
    setDetailLoading(true);
    setDetailError(null);

    try {
      const result = await fetchLocalCouncilPerson(person.person_key);
      if (requestId !== detailRequestIdRef.current || viewRef.current !== "roster") {
        return;
      }
      setPersonResult(result);
      setSelectedPersonKey(person.person_key);
      personResultRef.current = result;
      selectedPersonKeyRef.current = person.person_key;
      pushView("detail", createHistoryState("detail", person.person_key));
    } catch (err) {
      if (requestId !== detailRequestIdRef.current || viewRef.current !== "roster") {
        return;
      }
      console.error(err);
      setDetailError(
        err instanceof Error ? err.message : "선택한 인물 정보를 찾지 못했습니다.",
      );
    } finally {
      if (requestId === detailRequestIdRef.current) {
        setDetailLoading(false);
      }
    }
  };

  const handleRosterBack = () => {
    cancelResolveRequest();
    cancelDetailRequest();
    if (hasViewState(getHistoryState(window.history.state)) && window.history.length > 1) {
      window.history.back();
      return;
    }
    replaceView("address", createHistoryState("address"));
  };

  const handleDetailBack = () => {
    cancelResolveRequest();
    cancelDetailRequest();
    if (hasViewState(getHistoryState(window.history.state)) && window.history.length > 1) {
      window.history.back();
      return;
    }
    replaceView("roster", createHistoryState("roster"));
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
        {view === "roster" && rosterScreenResult && (
          <>
            <LocalCouncilRosterView
              rosterData={rosterScreenResult.data}
              dataSource={rosterScreenResult.dataSource}
              onSelectPerson={handleSelectPerson}
              onBack={handleRosterBack}
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
            dataSource={mergeLocalCouncilDataSources(
              rosterScreenResult?.dataSource,
              personResult.dataSource,
            )}
            partyName={selectedRosterPerson?.party_name ?? null}
            onBack={handleDetailBack}
          />
        )}
      </div>
    </div>
  );
}
