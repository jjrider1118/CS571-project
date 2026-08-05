import {
  searchAllianceAutocomplete,
  getAllianceGeneData,
  parseAllianceAutocomplete,
  parseAllianceGeneData,
} from "../api/allianceGenome";
import { ActionTypes } from "./queriesReducer";
import { runReferencesQuery } from "./runReferencesQuery";

// The async counterpart to queriesReducer.js: the reducer only knows how to
// apply an action to state synchronously, so something else has to actually
// call the API, wait on it, and dispatch the result. This is that "something
// else" — a plain function (not a React hook, doesn't need to be), called
// directly from the "+ New Query" form's submit handler with the reducer's
// `dispatch` and whatever gene symbol the user typed.
export async function runGeneQuery(dispatch, geneQuery) {
  const id = crypto.randomUUID();
  dispatch({ type: ActionTypes.START_QUERY, id, geneQuery });

  const autocompleteRaw = await searchAllianceAutocomplete(geneQuery);
  const matches = parseAllianceAutocomplete(autocompleteRaw);

  if (matches.length === 0) {
    dispatch({ type: ActionTypes.SET_QUERY_ERROR, queryId: id });
    return;
  }

  // Fetch every matched species' gene data in parallel — Alliance Genome hasn't
  // shown the same 3 req/sec CORS/rate-limit issues PubMed has, so there's no
  // known need to queue these. Revisit under the rate-limit-hardening step if
  // that turns out to be wrong.
  const species = await Promise.all(
    matches.map(async match => ({
      curie: match.curie,
      gene: parseAllianceGeneData(await getAllianceGeneData(match.curie)),
    }))
  );

  const validSpecies = species.filter(s => s.gene !== null);

  if (validSpecies.length === 0) {
    dispatch({ type: ActionTypes.SET_QUERY_ERROR, queryId: id });
    return;
  }

  dispatch({ type: ActionTypes.SET_QUERY_SPECIES, queryId: id, species: validSpecies });

  // Reference counts show on every card's collapsed header, so fetch them
  // eagerly rather than waiting for the user to open a card's References
  // face. Sequenced (not Promise.all) since PubMed's unauthenticated 3 req/sec
  // cap makes simultaneous per-species bursts flaky (see api/pubmed.js).
  for (const s of validSpecies) {
    await runReferencesQuery(dispatch, id, s.curie, s.gene);
  }
}
