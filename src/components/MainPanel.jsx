import { useEffect, useState } from "react";
import { Form, Row, Col, Button } from "react-bootstrap";
import { ActionTypes } from "../state/queriesReducer";
import EmptyState from "./EmptyState";
import SpeciesCard from "./SpeciesCard";

const ALL = ""; // sentinel value meaning "no filter" for each dropdown

// Renders whichever query is currently active (state.activeQueryId), as a stack
// of SpeciesCards — one per species match — or the empty state if no query
// has been run/selected yet. The three filter dropdowns narrow that stack down
// by species, symbol, or full name (independently, combined with AND).
function MainPanel({ query, dispatch }) {
  const [speciesFilter, setSpeciesFilter] = useState(ALL);
  const [symbolFilter, setSymbolFilter] = useState(ALL);
  const [nameFilter, setNameFilter] = useState(ALL);

  // Filters are scoped to whichever query is active — switching to a
  // different past query, or running a new one, starts unfiltered again.
  useEffect(() => {
    setSpeciesFilter(ALL);
    setSymbolFilter(ALL);
    setNameFilter(ALL);
  }, [query?.id]);

  if (!query) {
    return <EmptyState />;
  }

  const speciesOptions = [...new Set(query.species.map(s => s.gene.speciesName))];
  const symbolOptions = [...new Set(query.species.map(s => s.gene.symbol))];
  const nameOptions = [...new Set(query.species.map(s => s.gene.fullName))];

  const filteredSpecies = query.species.filter(
    s =>
      (speciesFilter === ALL || s.gene.speciesName === speciesFilter) &&
      (symbolFilter === ALL || s.gene.symbol === symbolFilter) &&
      (nameFilter === ALL || s.gene.fullName === nameFilter)
  );

  function handleSetAllExpanded(expanded) {
    dispatch({ type: ActionTypes.SET_ALL_SPECIES_EXPANDED, queryId: query.id, expanded });
  }

  return (
    <div className="p-3">
      <div className="d-flex justify-content-end gap-2 mb-2">
        <Button size="sm" variant="outline-secondary" onClick={() => handleSetAllExpanded(true)}>
          Expand All
        </Button>
        <Button size="sm" variant="outline-secondary" onClick={() => handleSetAllExpanded(false)}>
          Collapse All
        </Button>
      </div>

      <Row className="mb-3 g-2">
        <Col md={4}>
          <Form.Select
            size="sm"
            value={speciesFilter}
            onChange={event => setSpeciesFilter(event.target.value)}
          >
            <option value={ALL}>All species</option>
            {speciesOptions.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Select
            size="sm"
            value={symbolFilter}
            onChange={event => setSymbolFilter(event.target.value)}
          >
            <option value={ALL}>All symbols</option>
            {symbolOptions.map(symbol => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Select
            size="sm"
            value={nameFilter}
            onChange={event => setNameFilter(event.target.value)}
          >
            <option value={ALL}>All names</option>
            {nameOptions.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {filteredSpecies.length === 0 && (
        <p className="text-muted">No species match the selected filters.</p>
      )}

      {filteredSpecies.map(species => (
        <SpeciesCard
          key={species.curie}
          queryId={query.id}
          species={species}
          dispatch={dispatch}
        />
      ))}
    </div>
  );
}

export default MainPanel;
