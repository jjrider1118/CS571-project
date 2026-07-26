import { Card, ButtonGroup, Button } from "react-bootstrap";
import { ActionTypes } from "../state/queriesReducer";

// One stacked card per species match (see the "species array" discussion — each
// card corresponds to one entry in query.species). Its own viewMode decides
// whether it's showing the Alliance Genome overview ("data") or the PubMed
// reference list ("references"); that's per-card state, not shared across cards.
function SpeciesCard({ queryId, species, dispatch }) {
  const { curie, gene, viewMode, references, referencesStatus } = species;

  function handleToggle(targetView) {
    if (viewMode !== targetView) {
      dispatch({ type: ActionTypes.TOGGLE_SPECIES_VIEW, queryId, curie });
      // Step 7 will trigger the real lazy PubMed fetch here when
      // referencesStatus is still "idle" and targetView is "references".
    }
  }

  return (
    <Card bg="success" text="white" className="mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <Card.Subtitle className="mb-2">Species: {gene.speciesName}</Card.Subtitle>
            <Card.Text className="mb-1">Symbol: {gene.symbol}</Card.Text>
            <Card.Text className="mb-1">Name: {gene.fullName}</Card.Text>
          </div>
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
          <Card.Text className="mt-3 mb-0">{gene.description}</Card.Text>
        ) : (
          <div className="mt-3">
            {referencesStatus !== "ready" && <em>References not loaded yet.</em>}
            {referencesStatus === "ready" && (
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
      </Card.Body>
    </Card>
  );
}

export default SpeciesCard;
