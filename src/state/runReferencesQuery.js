import { searchPubMed, parsePubMedSummary } from "../api/pubmed";
import { ActionTypes } from "./queriesReducer";

// The async counterpart to queriesReducer.js for one species card's reference
// list — mirrors runGeneQuery.js's role for the top-level query. Called lazily
// from SpeciesCard the first time a card is flipped to its References face
// (or retried after an error), never upfront with the gene data.
export async function runReferencesQuery(dispatch, queryId, curie, gene) {
  dispatch({ type: ActionTypes.SET_SPECIES_REFERENCES_LOADING, queryId, curie });

  // Same term shape used during API research (see the outer repo's
  // API_Testing.js): species common name AND gene symbol, e.g.
  // "(zebrafish) AND (lama1)" — narrows PubMed results to papers about this
  // gene in this specific species, rather than every species' lama1 hits.
  const speciesTerm = gene.speciesCommonNames[0] ?? gene.speciesName;
  const term = `(${speciesTerm}) AND (${gene.symbol})`;

  const result = await searchPubMed(term);

  if (result === null) {
    dispatch({ type: ActionTypes.SET_SPECIES_REFERENCES_ERROR, queryId, curie });
    return;
  }

  const references = parsePubMedSummary(result.summaryResponse);
  dispatch({
    type: ActionTypes.SET_SPECIES_REFERENCES,
    queryId,
    curie,
    references,
    totalCount: result.totalCount,
  });
}
