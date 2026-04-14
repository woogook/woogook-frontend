import resolveSample from "../src/data/samples/sample_local_council_gangdong_resolve.json";
import personSamples from "../src/data/samples/sample_local_council_gangdong_person_dossiers.json";
import {
  localCouncilPersonDossierResponseSchema,
  localCouncilResolveResponseSchema,
} from "../src/lib/schemas";

localCouncilResolveResponseSchema.parse(resolveSample);

const dossiers = Object.values(personSamples);
if (dossiers.length < 2) {
  throw new Error("expected at least two local council person dossier samples");
}

const rosterPersonKeys = [
  resolveSample.roster.district_head.person_key,
  ...resolveSample.roster.council_members.map((person) => person.person_key),
];
const missingDossiers = rosterPersonKeys.filter((personKey) => !(personKey in personSamples));
if (missingDossiers.length > 0) {
  throw new Error(
    `expected dossier samples for every roster person: ${missingDossiers.join(", ")}`,
  );
}

if (
  !resolveSample.roster.council_members.some((person) =>
    person.person_key.includes("서울_강동구의회_002003"),
  )
) {
  throw new Error("expected at least one opaque fallback person_key sample");
}

for (const [personKey, dossier] of Object.entries(personSamples)) {
  localCouncilPersonDossierResponseSchema.parse(dossier);

  const spotCheckCarrier = dossier as {
    diagnostics?: {
      spot_check?: {
        kind?: string;
        member_source_docid?: string;
        person_key?: string;
      };
    };
    spot_check?: {
      kind?: string;
      member_source_docid?: string;
      person_key?: string;
    };
  };
  const spotCheck =
    spotCheckCarrier.diagnostics?.spot_check ?? spotCheckCarrier.spot_check;
  if (spotCheck?.person_key && spotCheck.person_key !== personKey) {
    throw new Error(`expected spot_check.person_key to match dossier key: ${personKey}`);
  }

  const gangdongFallbackPrefix =
    "seoul-gangdong:council-member:서울_강동구의회_002003:";
  if (
    personKey.startsWith(gangdongFallbackPrefix) &&
    spotCheck?.kind === "member_source_docid" &&
    spotCheck.member_source_docid &&
    personKey !== `${gangdongFallbackPrefix}${spotCheck.member_source_docid}`
  ) {
    throw new Error(
      `expected fallback person_key and member_source_docid to align: ${personKey}`,
    );
  }
}

console.log(`validated ${dossiers.length} local council person dossier samples`);
