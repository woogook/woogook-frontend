# -*- coding: utf-8 -*-
"""Emit UTF-8 plan markdown (ASCII-only source via \\u escapes)."""
from __future__ import annotations

from pathlib import Path


def _md() -> str:
    return "".join(
        [
            "# Assembly \uacf5\uc57d \uc774\ud589\ub960 \u2014 \uc758\uc6d0 \uba54\ud0c0 \uce74\ub4dc API \uc5f0\ub3d9 \uacc4\ud68d\n",
            "\n",
            "> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.\n",
            "\n",
            "**Goal:** `/assembly/pledge?city=\u2026&sigungu=\u2026&mona_cd=\u2026` \ud654\uba74\uc5d0\uc11c \ud504\ub85c\ud544(\uc774\ub984\xb7\ub2f9\xb7\uc120\uac70\uad6c\xb7\uc704\uc6d0\ud68c\xb7\uc120\uac70\uacf5\ubcf4 PDF \ub4f1)\uc744 \ucc44\uc6b0\uae30 \uc704\ud574 `GET /api/assembly/v1/members/{mona_cd}/card` \ubc31\uc5d4\ub4dc API\ub97c \uc5f0\ub3d9\ud55c\ub2e4.\n",
            "\n",
            "**Architecture:** \ube0c\ub77c\uc6b0\uc800\ub294 \ubc31\uc5d4\ub4dc\uc5d0 \uc9c1\uc811 \ubd99\uc9c0 \uc54a\uace0 Next API \ub77c\uc6b0\ud2b8\ub97c \uac70\uce5c\ub2e4. `proxyToBackend`\ub85c FastAPI(`WOOGOOK_BACKEND_BASE_URL`)\uc5d0 \uc804\ub2ec\ud55c\ub2e4. \ud504\ub860\ud2b8\ub294 Zod \uc2a4\ud0a4\ub9c8 + React Query\ub85c `mona_cd`\uac00 \uc788\uc744 \ub54c\ub9cc \uce74\ub4dc API\ub97c \ud638\ucd9c\ud55c\ub2e4. \uae30\uc874 \ubaa9\ub85d\uc6a9(`GET \u2026/members/{id}`)\uacfc\ub294 \ubcc4\ub3c4 \uc5d4\ub4dc\ud3ec\uc778\ud2b8\ub2e4.\n",
            "\n",
            "**Tech Stack:** Next.js App Router, React Query(`@tanstack/react-query`), Zod, \uacf5\ud1b5 `fetchJson` / `api-client` \ud328\ud134.\n",
            "\n",
            "---\n\n",
            "## \ubc94\uc704 \ud45c\n\n",
            "| \uad6c\ubd84 | \uacbd\ub85c | \uc5ed\ud560 |\n",
            "|------|------|------|\n",
            "| Next \ub77c\uc6b0\ud2b8 (\uc2e0\uaddc) | `src/app/api/assembly/v1/members/[mona_cd]/card/route.ts` | `GET` \u2192 `{BACKEND}/api/assembly/v1/members/{mona_cd}/card` |\n",
            "| \uc2a4\ud0a4\ub9c8 | `src/lib/schemas.ts` | `assemblyMemberMetaCardSchema` + \ud0c0\uc785 export |\n",
            "| API \ud074\ub77c\uc774\uc5b8\ud2b8 | `src/lib/api-client.ts` | `fetchAssemblyMemberMetaCard`, `assemblyMemberMetaCardQueryOptions` |\n",
            "| \ud398\uc774\uc9c0 | `src/features/assembly/AssemblyPledgeRatePage.tsx` | \uce74\ub4dc \uc870\ud68c, \ub85c\ub529\xb7\uc5d0\ub7ec\xb7\ud3f4\ubc31 UI \ubc18\uc601 |\n",
            "| (\uc120\ud0dd) | `src/features/assembly/AssemblyPledgeCategoryTopPage.tsx` | \ub3d9\uc77c \uce74\ub4dc \ub370\uc774\ud130\uac00 \ud544\uc694\ud558\uba74 \uc7ac\uc0ac\uc6a9 \ub610\ub294 \ud6c4\uc18d |\n",
            "\n",
            "\ucc38\uace0: \ubaa9\ub85d\uc6a9 \ud504\ub85d\uc2dc\ub294 `src/app/api/assembly/v1/members/route.ts`\uc5d0 \uc774\ubbf8 \uc788\ub2e4.\n",
            "\n",
            "---\n\n",
            "## API\xb7\ud544\ub4dc \ub9e4\ud551\n\n",
            "\uc751\ub2f5 `AssemblyMemberMetaCard` \ud544\ub4dc\uc640 UI \ub9e4\ud551:\n\n",
            "- `name` \u2192 \ud45c\uc2dc \uc774\ub984(\uae30\uc874 `demoName` \ub300\uccb4)\n",
            "- `election_count_text` \u2192 \u201c\uc81c N\uc120 \u2026\u201d \ub4f1(\uae30\uc874 `demoTerms`)\n",
            "- `party_name` + `district_label` \u2192 `\"{party} \xb7 {district}\"` \ud55c \uc904(\uae30\uc874 `demoAffiliation`; `null`\uc774\uba74 `\u2014` \ub4f1 \ucc98\ub9ac)\n",
            "- `profile_image_url` \u2192 \uc678\ubd80 `<img>`, \uc2e4\ud328 \uc2dc \ud50c\ub808\uc774\uc2a4\ud640\ub354 `User` \uc544\uc774\ucf58\n",
            "- `campaign_booklet_pdf_url` \u2192 \uc788\uc73c\uba74 \ub9c1\ud06c \uc6b0\uc120. \uc5c6\uc744 \ub54c\ub9cc `getAssembly22CampaignBookletPublicPdfUrl()` \ub4f1 \ud3f4\ubc31(\uc8fc\uc758: **API \uc6b0\uc120**, env\ub294 \ubcf4\uc870/\uac1c\ubc1c\uc6a9)\n",
            "- `current_committee_name` \u2192 \uc788\uc73c\uba74 \uc704\uc6d0\ud68c \ud55c \uc904 \ud45c\uc2dc\n\n",
            "`selectionNote`\ub294 `mona_cd`\uc640 \ud568\uaed8 **\uc120\ud0dd \uc9c0\uc5ed \ubb38\uad6c\ub9cc** \uc720\uc9c0\ud574\ub3c4 \ub418\uace0, \uce74\ub4dc\uc640 \uc911\ubcf5\ub418\uba74 \uc815\ub9ac\ud55c\ub2e4(\uc120\ud0dd \uc0ac\ud56d).\n",
            "\n",
            "---\n\n",
            "### Task 1: Next \uce74\ub4dc \ud504\ub85d\uc2dc\n\n",
            "**Files:**\n\n",
            "- Create: `src/app/api/assembly/v1/members/[mona_cd]/card/route.ts`\n\n",
            "- [ ] **Step 1:** `members/route.ts`\uc640 \ub3d9\uc77c\ud558\uac8c `proxyToBackend` \uc0ac\uc6a9.\n",
            "- [ ] **Step 2:** `GET`\uc5d0\uc11c `params.mona_cd`\ub97c `encodeURIComponent`\ub85c \uc774\uc2a4\ucf00\uc774\ud504\ud55c \ub4a4\n",
            "  `pathWithQuery = `/api/assembly/v1/members/${encoded}/card`` \ub85c \uc804\ub2ec.\n",
            "- [ ] **Step 3:** \ub85c\ucf5c\uc5d0\uc11c `curl http://localhost:3000/api/assembly/v1/members/68P7228G/card` (`WOOGOOK_BACKEND_BASE_URL` \uac00\uc815)\uc73c\ub85c 200/JSON \ud655\uc778.\n",
            "\n",
            "---\n\n",
            "### Task 2: Zod \uc2a4\ud0a4\ub9c8\n\n",
            "**Files:**\n\n",
            "- Modify: `src/lib/schemas.ts`\n\n",
            "- [ ] **Step 1:** \ud544\ub4dc: `member_mona_cd`, `name`, `party_name`, `profile_image_url`, `district_label`, `current_committee_name`, `election_count_text`, `campaign_booklet_pdf_url` (\ubc31\uc5d4\ub4dc \uacc4\uc57d\uc5d0 \ub9de\uccd0 null \ud5c8\uc6a9, optional\uc740 \uc2e4\uc81c \uc751\ub2f5\uc5d0 \ub9de\uac8c).\n",
            "- [ ] **Step 2:** `export type AssemblyMemberMetaCard = z.infer<typeof assemblyMemberMetaCardSchema>`.\n",
            "\n",
            "---\n\n",
            "### Task 3: API \ud074\ub77c\uc774\uc5b8\ud2b8 + React Query\n\n",
            "**Files:**\n\n",
            "- Modify: `src/lib/api-client.ts`\n\n",
            "- [ ] **Step 1:** `fetchAssemblyMemberMetaCard(monaCd: string)` \u2192 `fetchJson(\\`/api/assembly/v1/members/${encodeURIComponent(monaCd)}/card\\`, schema)`.\n",
            "- [ ] **Step 2:** `assemblyMemberMetaCardQueryOptions(monaCd: string)` \u2014 `queryKey: [\"assembly\", \"member\", \"card\", monaCd]`, `enabled: monaCd.trim().length > 0`, `staleTime`\uc740 \uc9e7\uac8c(\uc608: 5\ubd84).\n",
            "- [ ] **Step 3:** `retry: 0` \ub4f1 assembly \uce74\ub4dc \ud638\ucd9c \uc815\ucc45 \uc815\ub9ac.\n",
            "\n",
            "---\n\n",
            "### Task 4: `AssemblyPledgeRatePage` \ubc18\uc601\n\n",
            "**Files:**\n\n",
            "- Modify: `src/features/assembly/AssemblyPledgeRatePage.tsx`\n\n",
            "- [ ] **Step 1:** `useQuery(assemblyMemberMetaCardQueryOptions(monaCdRaw ?? \"\"))` \u2014 `mona_cd` \uc5c6\uc73c\uba74 enabled false, \uc2a4\ucf08\ub808\ud1a4\xb7\ud3f4\ubc31 UX \uc720\uc9c0.\n",
            "- [ ] **Step 2:** \uc131\uacf5 \uc2dc: \uce74\ub4dc \ud544\ub4dc\ub85c \ud504\ub85c\ud544 \uc601\uc5ed + \uacf5\ubcf4 \ubc84\ud2bc \uac31\uc2e0.\n",
            "- [ ] **Step 3:** \uc5d0\ub7ec/404: \uc0ac\uc6a9\uc790 \uba54\uc2dc\uc9c0(\u201c\uc758\uc6d0 \uc815\ubcf4\ub97c \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4\u201d \ub4f1).\n",
            "- [ ] **Step 4:** \uc811\uadfc\uc131: \ud504\ub85c\ud544\xb7\uacf5\ubcf4\xb7`aria-label`\uc5d0 `name` \ubc18\uc601 \ub4f1.\n",
            "- [ ] **Step 5:** \uc218\ub3d9 \uac80\uc99d\n",
            "  `http://localhost:3000/assembly/pledge?city=\uc11c\uc6b8\ud2b9\ubcc4\uc2dc&sigungu=\uac15\ub3d9\uad6c&mona_cd=68P7228G`\n",
            "  \uc5d0\uc11c \uc774\ub984\xb7\uc774\ubbf8\uc9c0\xb7\uacf5\ubcf4 \ub9c1\ud06c \ud655\uc778.\n",
            "\n",
            "---\n\n",
            "### Task 5 (\uc120\ud0dd): \uce74\ud14c\uace0\ub9ac \uc0c1\uc138 \ud5e4\ub354\n\n",
            "**Files:**\n\n",
            "- Modify: `src/features/assembly/AssemblyPledgeCategoryTopPage.tsx` \ub610\ub294 \uacf5\ud1b5 `AssemblyMemberProfileHeader.tsx` \ucd94\ucd9c\n\n",
            "- [ ] **Step 1:** \ub3d9\uc77c `mona_cd`\ub85c \uce74\ub4dc \ucffc\ub9ac\ub97c \uacf5\uc720\ud574 \uc0c1\ub2e8\uc5d0 \uc758\uc6d0 \uc694\uc57d\uc774 \ud544\uc694\ud558\uba74 \uc5f0\ub3d9.\n",
            "\n",
            "---\n\n",
            "## \uc5d0\uc9c0\xb7\uc6b4\uc601 \uccb4\ud06c\ub9ac\uc2a4\ud2b8\n\n",
            "- [ ] `mona_cd` \ube48 \uac12: \uc694\uccad \uc5c6\uc774 \ud3f4\ubc31(\ub370\ubaa8 \uc774\ub984 \ub4f1).\n",
            "- [ ] \ubc31\uc5d4\ub4dc 503(`WOOGOOK_BACKEND_BASE_URL` \uc624\ub958): \uc0ac\uc6a9\uc790 \uc548\ub0b4 \ubb38\uad6c.\n",
            "- [ ] \ud504\ub85c\ud544 \uc774\ubbf8\uc9c0 URL: Next `next.config` `images.remotePatterns` \ud544\uc694 \uc2dc \uc124\uc815(\ud604\uc7ac\ub294 `<img>` \uc9c1\uc811 \uc0ac\uc6a9 \uc2dc CORS/\ub3c4\uba54\uc778 \uc8fc\uc758).\n",
            "\n",
            "---\n\n",
            "## \ud658\uacbd \ubcc0\uc218\n\n",
            "- **\ubc31\uc5d4\ub4dc(\uc11c\ubc84):** `WOOGOOK_BACKEND_BASE_URL` \u2014 Next API\uac00 \ud638\ucd9c\ud558\ub294 FastAPI \ubca0\uc774\uc2a4 URL(\ub85c\uceec \uc608: `http://127.0.0.1:8000`).\n",
            "- **\uc120\ud0dd:** `NEXT_PUBLIC_ASSEMBLY22_CAMPAIGN_BOOKLET_PDF_URL` \u2014 API\uc5d0 `campaign_booklet_pdf_url`\uc774 \uc5c6\uc744 \ub54c\ub9cc \uc4f0\ub294 \ud3f4\ubc31 PDF.\n",
            "\n",
            "---\n\n",
            "## `/write-plan` \uc548\ub0b4\n\n",
            "Cursor\uc5d0\uc11c **`/write-plan` \ucee4\ub9e8\ub4dc\ub294 deprecated**\uc77c \uc218 \uc788\uc73c\ubbc0\ub85c, \ubcf8 \uc791\uc5c5\uc740 superpowers **`writing-plans` \uc2a4\ud0ac**\ub85c \uad6c\ud604 \uacc4\ud68d\uc744 \ucabd\uac1c\ub294 \ud750\ub984\uc744 \uad8c\uc7a5\ud55c\ub2e4.\n",
        ]
    )


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out = root / "docs/superpowers/plans" / "2026-04-07-assembly-pledge-member-meta-card-api.md"
    text = _md()
    out.write_text(text, encoding="utf-8", newline="\n")
    b = out.read_bytes()[:4]
    if b.startswith(b"\xef\xbb\xbf"):
        raise SystemExit("unexpected BOM")
    print(f"Wrote {out.relative_to(root)} ({len(text)} chars, utf-8)")


if __name__ == "__main__":
    main()
