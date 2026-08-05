// ---------------------------------------------------------------------------
// What is a "reducer", and why not just use useState like everywhere else?
//
// With useState, each piece of state gets its own setter, and *the component*
// decides how to update it: `setSomething(newValue)`. That's fine when state
// is simple and flat. Our state isn't flat, though — it's a list of queries,
// each holding a list of species cards, each with its own gene data and
// reference list. Toggling one card's view mode means reaching through three
// levels (queries -> the right query -> the right species card) and
// rebuilding all three levels without mutating the originals (React needs a
// new object/array reference to notice something changed). Doing that inline
// in a component, over and over for every kind of update, gets repetitive
// and error-prone fast.
//
// A reducer moves that "how do I update the nested state" logic into ONE
// function, written once, in one place: this file. Instead of many setters,
// you get exactly two things from React's useReducer hook:
//   - `state`    — the current data, read-only from the component's view
//   - `dispatch` — a function you call to describe something that happened
//
// A component never edits state directly. It calls dispatch with an
// "action" — a plain object describing what happened, e.g.
//   dispatch({ type: "TOGGLE_SPECIES_VIEW", queryId: "1", curie: "ZFIN:..." })
// React then calls the reducer function below with the current state and
// that action, and whatever the reducer *returns* becomes the new state.
//
// So a reducer is just a function with this shape:
//   (currentState, action) => newState
// It must be "pure": given the same state and action, it always produces
// the same result, and it never mutates currentState directly — it always
// returns a new object/array built from copies of the old one. That's the
// same immutability rule you'd already be following with useState; a
// reducer just gives you one dedicated function to do it in, instead of
// scattering the logic across every event handler in the app.
// ---------------------------------------------------------------------------

export const initialState = {
  queries: [],       // sidebar history — every gene search the user has run this session
  activeQueryId: null, // which query's results are shown in the main panel; null = empty state
};

// Every possible action type is listed here as a constant. This isn't required by
// React — plain strings would work — but it means a typo like "TOGGLE_SPECIES_VIWE"
// becomes an instant error (undefined variable) instead of a silently-ignored action.
export const ActionTypes = {
  START_QUERY: "START_QUERY",
  SET_QUERY_SPECIES: "SET_QUERY_SPECIES",
  SET_QUERY_ERROR: "SET_QUERY_ERROR",
  SET_ACTIVE_QUERY: "SET_ACTIVE_QUERY",
  TOGGLE_SPECIES_VIEW: "TOGGLE_SPECIES_VIEW",
  SET_SPECIES_REFERENCES_LOADING: "SET_SPECIES_REFERENCES_LOADING",
  SET_SPECIES_REFERENCES: "SET_SPECIES_REFERENCES",
  SET_SPECIES_REFERENCES_ERROR: "SET_SPECIES_REFERENCES_ERROR",
  TOGGLE_SPECIES_EXPANDED: "TOGGLE_SPECIES_EXPANDED",
  SET_ALL_SPECIES_EXPANDED: "SET_ALL_SPECIES_EXPANDED",
};

// Small helper used by several branches below: rebuild the `queries` array with
// one query replaced by the result of `updateQuery`, leaving every other query
// untouched. This is the "don't mutate, rebuild a copy" rule in practice —
// `.map` already returns a brand-new array, and each query we're not touching
// is passed through unchanged (same reference), while the matching one is
// swapped for a new object.
function updateQueryById(queries, queryId, updateQuery) {
  return queries.map(query => (query.id === queryId ? updateQuery(query) : query));
}

// Same idea, one level deeper: rebuild a query's `species` array with one
// species card replaced, identified by its curie (e.g. "ZFIN:ZDB-GENE-060118-1").
function updateSpeciesByCurie(species, curie, updateSpecies) {
  return species.map(s => (s.curie === curie ? updateSpecies(s) : s));
}

// This is the reducer itself. React hands it the current state and an action
// object; a `switch` on `action.type` picks the matching branch, and whatever
// that branch returns becomes the new state. If no branch matches, we return
// `state` unchanged (the standard reducer fallback) — that path shouldn't be
// reachable if every dispatch uses one of the ActionTypes above.
export function queriesReducer(state, action) {
  switch (action.type) {
    // A new search was submitted. Add a placeholder query (no species yet,
    // status "loading") and make it the active one so the UI can immediately
    // show a loading state while the API calls are still in flight.
    case ActionTypes.START_QUERY: {
      const newQuery = {
        id: action.id,
        geneQuery: action.geneQuery,
        status: "loading",
        species: [],
      };
      return {
        ...state, // copy every other top-level field (there's only activeQueryId here, but
                  // this pattern is what keeps the reducer safe if we add more fields later)
        queries: [...state.queries, newQuery],
        activeQueryId: action.id,
      };
    }

    // The autocomplete + per-species gene fetches for a query have all resolved.
    // Fill in its species list and mark it ready.
    case ActionTypes.SET_QUERY_SPECIES: {
      return {
        ...state,
        queries: updateQueryById(state.queries, action.queryId, query => ({
          ...query,
          status: "ready",
          species: action.species.map(s => ({
            ...s,
            viewMode: "data",             // every card starts showing the Data face
            references: null,
            referencesStatus: "idle",     // filled in eagerly by runGeneQuery — see runReferencesQuery.js
            referencesCount: null,        // PubMed's true total match count, shown on the collapsed header
            expanded: false,              // cards start collapsed to a quick-scan summary
          })),
        })),
      };
    }

    // Something went wrong fetching this query's data (e.g. network failure).
    case ActionTypes.SET_QUERY_ERROR: {
      return {
        ...state,
        queries: updateQueryById(state.queries, action.queryId, query => ({
          ...query,
          status: "error",
        })),
      };
    }

    // User clicked a past search in the sidebar — just switch which query is displayed.
    // No data changes here, so this is the simplest possible action.
    case ActionTypes.SET_ACTIVE_QUERY: {
      return { ...state, activeQueryId: action.queryId };
    }

    // Flip one species card between its "data" and "references" face.
    case ActionTypes.TOGGLE_SPECIES_VIEW: {
      return {
        ...state,
        queries: updateQueryById(state.queries, action.queryId, query => ({
          ...query,
          species: updateSpeciesByCurie(query.species, action.curie, s => ({
            ...s,
            viewMode: s.viewMode === "data" ? "references" : "data",
          })),
        })),
      };
    }

    // Flip one card between its collapsed (quick-scan summary) and expanded
    // (full data/references) states.
    case ActionTypes.TOGGLE_SPECIES_EXPANDED: {
      return {
        ...state,
        queries: updateQueryById(state.queries, action.queryId, query => ({
          ...query,
          species: updateSpeciesByCurie(query.species, action.curie, s => ({
            ...s,
            expanded: !s.expanded,
          })),
        })),
      };
    }

    // "Expand All" / "Collapse All": set every card in one query to the same
    // expanded state at once, rather than clicking through them one at a time.
    case ActionTypes.SET_ALL_SPECIES_EXPANDED: {
      return {
        ...state,
        queries: updateQueryById(state.queries, action.queryId, query => ({
          ...query,
          species: query.species.map(s => ({ ...s, expanded: action.expanded })),
        })),
      };
    }

    // References are fetched on demand (the first time a card is flipped to the
    // References face), not upfront with the gene data — these three actions mark
    // that fetch's progress the same way SET_QUERY_SPECIES/SET_QUERY_ERROR do for
    // the query as a whole, just scoped to one species card instead.
    case ActionTypes.SET_SPECIES_REFERENCES_LOADING: {
      return {
        ...state,
        queries: updateQueryById(state.queries, action.queryId, query => ({
          ...query,
          species: updateSpeciesByCurie(query.species, action.curie, s => ({
            ...s,
            referencesStatus: "loading",
          })),
        })),
      };
    }

    case ActionTypes.SET_SPECIES_REFERENCES: {
      return {
        ...state,
        queries: updateQueryById(state.queries, action.queryId, query => ({
          ...query,
          species: updateSpeciesByCurie(query.species, action.curie, s => ({
            ...s,
            referencesStatus: "ready",
            references: action.references,
            referencesCount: action.totalCount,
          })),
        })),
      };
    }

    case ActionTypes.SET_SPECIES_REFERENCES_ERROR: {
      return {
        ...state,
        queries: updateQueryById(state.queries, action.queryId, query => ({
          ...query,
          species: updateSpeciesByCurie(query.species, action.curie, s => ({
            ...s,
            referencesStatus: "error",
          })),
        })),
      };
    }

    // Fallback for safety: an unrecognized action leaves state untouched instead
    // of throwing, so a typo'd action type fails quietly rather than crashing the app.
    default:
      return state;
  }
}
