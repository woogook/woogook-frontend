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

for (const dossier of dossiers) {
  localCouncilPersonDossierResponseSchema.parse(dossier);
}

console.log(`validated ${dossiers.length} local council person dossier samples`);
