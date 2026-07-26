// Alliance Genome Resources (www.alliancegenome.org/api) — CORS-clean, verified via npm run dev.
// search_autocomplete?q= returns one gene_search_result per matching species (curie prefix
// identifies the species DB, e.g. ZFIN:/MGI:/HGNC:/Xenbase:/RGD:) — no separate ortholog call
// needed for the species toggle. /api/gene/{curie} gives symbol/name/synonyms/description/
// crossReferences (each crossReference urlTemplate takes the curie's part after ":").

export async function searchAllianceAutocomplete(query) {
  try {
    // encodeURIComponent escapes characters (spaces, &, /, etc.) that would otherwise be
    // misread as part of the URL's structure (e.g. as a separator between query params).
    const res = await fetch(
      `https://www.alliancegenome.org/api/search_autocomplete?q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } }
    );
    return await res.json();
  } catch (err) {
    console.error(`[Alliance autocomplete] "${query}" FAILED (likely CORS/network):`, err);
    return null;
  }
}

export async function getAllianceGeneData(curie) {
  try {
    const res = await fetch(
      `https://www.alliancegenome.org/api/gene/${curie}`,
      { headers: { Accept: "application/json" } }
    );
    return await res.json();
  } catch (err) {
    console.error(`[Alliance gene] ${curie} FAILED (likely CORS/network):`, err);
    return null;
  }
}

export function parseAllianceAutocomplete(autocompleteResponse) {
  return (autocompleteResponse?.results ?? [])
    .filter(r => r.category === "gene_search_result")
    .map(r => ({ symbol: r.symbol, curie: r.curie, label: r.nameKey }));
}

export function parseAllianceGeneData(geneResponse) {
  const g = geneResponse?.gene;
  if (!g) return null;

  const description = g.relatedNotes?.find(
    n => n.noteType?.name === "automated_gene_description"
  )?.freeText ?? null;

  return {
    curie: g.primaryExternalId,
    symbol: g.geneSymbol?.displayText,
    fullName: g.geneFullName?.displayText,
    synonyms: (g.geneSynonyms ?? []).map(s => s.displayText),
    speciesName: g.taxon?.name,
    speciesCommonNames: g.taxon?.species?.commonNames ?? [],
    dataProvider: g.dataProvider?.fullName,
    description,
    crossReferences: (g.crossReferences ?? []).map(ref => {
      const idPart = ref.referencedCurie.split(":").slice(1).join(":");
      return {
        curie: ref.referencedCurie,
        label: ref.displayName,
        url: ref.resourceDescriptorPage?.urlTemplate?.replace("[%s]", idPart) ?? null,
      };
    }),
  };
}
