import { useState } from "react";
import { Button, ListGroup } from "react-bootstrap";
import { ActionTypes } from "../state/queriesReducer";
import { runGeneQuery } from "../state/runGeneQuery";
import NewQueryForm from "./NewQueryForm";

// The query history list + "+ New Query" entry point. Clicking a past query just
// switches which one is active (no re-fetching — its data is already in state).
function Sidebar({ state, dispatch }) {
  const [showForm, setShowForm] = useState(false);

  function handleSelectQuery(queryId) {
    dispatch({ type: ActionTypes.SET_ACTIVE_QUERY, queryId });
  }

  function handleSubmitQuery(geneQuery) {
    setShowForm(false);
    runGeneQuery(dispatch, geneQuery);
  }

  return (
    <div className="d-flex flex-column h-100 bg-light border-end p-3">
      <h5>Vertebrate Genome Researcher</h5>
      <Button variant="outline-primary" className="mb-3" onClick={() => setShowForm(v => !v)}>
        (+) New Query
      </Button>

      {showForm && <NewQueryForm onSubmit={handleSubmitQuery} />}

      <ListGroup>
        {state.queries.map(query => (
          <ListGroup.Item
            key={query.id}
            action
            active={query.id === state.activeQueryId}
            onClick={() => handleSelectQuery(query.id)}
          >
            {query.geneQuery}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
}

export default Sidebar;
