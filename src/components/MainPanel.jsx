import EmptyState from "./EmptyState";
import SpeciesCard from "./SpeciesCard";

// Renders whichever query is currently active (state.activeQueryId), as a stack
// of SpeciesCards — one per species match — or the empty state if no query
// has been run/selected yet.
function MainPanel({ query, dispatch }) {
  if (!query) {
    return <EmptyState />;
  }

  return (
    <div className="p-3">
      {query.species.map(species => (
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
