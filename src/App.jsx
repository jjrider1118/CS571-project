import { useReducer } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { queriesReducer, initialState } from "./state/queriesReducer";
import Sidebar from "./components/Sidebar";
import MainPanel from "./components/MainPanel";

function App() {
  const [state, dispatch] = useReducer(queriesReducer, initialState);

  const activeQuery = state.queries.find(q => q.id === state.activeQueryId) ?? null;

  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 g-0">
        <Col md={3} className="h-100">
          <Sidebar state={state} dispatch={dispatch} />
        </Col>
        <Col md={9} className="h-100 overflow-auto">
          <MainPanel query={activeQuery} dispatch={dispatch} />
        </Col>
      </Row>
    </Container>
  );
}

export default App;
