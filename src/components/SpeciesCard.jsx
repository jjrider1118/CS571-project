import { Card, ButtonGroup, Button, Collapse } from "react-bootstrap";
import { ActionTypes } from "../state/queriesReducer";
import { runReferencesQuery } from "../state/runReferencesQuery";

// The reference count is part of the always-visible header (see below), so it
// needs a label for every referencesStatus, not just "ready".
function formatReferencesLabel(referencesStatus, referencesCount) {
  if (referencesStatus === "ready") {
    return `${referencesCount} reference${referencesCount === 1 ? "" : "s"}`;
  }
  if (referencesStatus === "error") return "references unavailable";
  return "loading references...";
}

// One stacked card per species match (see the "species array" discussion — each
// card corresponds to one entry in query.species). The header line (symbol,
// species, reference count) is always shown and never changes between
// collapsed/expanded so toggling doesn't shift that text around. Everything
// else — the full description and the Data/References toggle — lives in the
// collapsible body. viewMode is separate per-card state deciding which face
// (Alliance Genome "data" or PubMed "references") that body shows.
function SpeciesCard({ queryId, species, dispatch }) {
  const { curie, gene, viewMode, references, referencesStatus, referencesCount, expanded } = species;

  function handleToggle(targetView) {
    if (viewMode !== targetView) {
      dispatch({ type: ActionTypes.TOGGLE_SPECIES_VIEW, queryId, curie });
      // Fetch on first visit to the References face, and again if a
      // previous attempt errored out — otherwise reuse what's already loaded.
      if (targetView === "references" && (referencesStatus === "idle" || referencesStatus === "error")) {
        runReferencesQuery(dispatch, queryId, curie, gene);
      }
    }
  }

  function handleRetryReferences() {
    runReferencesQuery(dispatch, queryId, curie, gene);
  }

  function handleToggleExpanded() {
    dispatch({ type: ActionTypes.TOGGLE_SPECIES_EXPANDED, queryId, curie });
  }

  return (
    <Card bg="success" text="white" className="mb-3">
      <Card.Body className="text-start">
        <div className="d-flex justify-content-between align-items-center gap-3">
          <Card.Subtitle className="mb-0">
            {gene.symbol} - {gene.speciesName} ({formatReferencesLabel(referencesStatus, referencesCount)})
          </Card.Subtitle>
          <Button variant="dark" size="sm" onClick={handleToggleExpanded}>
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </div>

        <Collapse in={expanded}>
          <div className="mt-3">
            <Card.Text className="fst-italic mb-2">{gene.fullName}</Card.Text>

            <div className="d-flex justify-content-end mb-2">
              <ButtonGroup size="sm">
                <Button
                  variant="dark"
                  active={viewMode === "references"}
                  onClick={() => handleToggle("references")}
                >
                  References
                </Button>
                <Button
                  variant="dark"
                  active={viewMode === "data"}
                  onClick={() => handleToggle("data")}
                >
                  Data
                </Button>
              </ButtonGroup>
            </div>

            {viewMode === "data" ? (
              <Card.Text className="mb-0">{gene.description}</Card.Text>
            ) : (
              <div>
                {(referencesStatus === "idle" || referencesStatus === "loading") && (
                  <em>Loading references...</em>
                )}
                {referencesStatus === "error" && (
                  <div>
                    <em>Couldn't load references (PubMed may be rate-limiting requests).</em>{" "}
                    <Button variant="link" size="sm" className="p-0 text-white" onClick={handleRetryReferences}>
                      Retry
                    </Button>
                  </div>
                )}
                {referencesStatus === "ready" && references.length === 0 && (
                  <em>No references found.</em>
                )}
                {referencesStatus === "ready" && references.length > 0 && (
                  <ul className="mb-0">
                    {references.map(ref => (
                      <li key={ref.pmid}>
                        <a href={ref.url} target="_blank" rel="noreferrer" className="text-white">
                          {ref.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Collapse>
      </Card.Body>
    </Card>
  );
}

export default SpeciesCard;
