import { useEffect, useRef, useState } from "react";
import { Form, ListGroup } from "react-bootstrap";
import { searchAllianceAutocomplete, parseAllianceAutocomplete } from "../api/allianceGenome";

// Wait this long after the user stops typing before calling the live
// autocomplete API — avoids firing a request on every single keystroke.
const AUTOCOMPLETE_DEBOUNCE_MS = 300;

function NewQueryForm({ onSubmit }) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const raw = await searchAllianceAutocomplete(text.trim());
      const matches = parseAllianceAutocomplete(raw);

      // The same symbol can show up once per species (e.g. "lama1" matches
      // both zebrafish and frog) — dedupe so the dropdown lists each distinct
      // gene name once, not once per species.
      setSuggestions([...new Set(matches.map(m => m.symbol))]);
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [text]);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    setSuggestions([]);
    onSubmit(trimmed);
  }

  function handleSuggestionClick(symbol) {
    setSuggestions([]);
    onSubmit(symbol);
  }

  return (
    <Form onSubmit={handleSubmit} className="mb-3">
      {/* "Gene" is the only supported query type right now — this is where a
          real dropdown would go if more types are added later. */}
      <Form.Group className="mb-2">
        <Form.Select disabled defaultValue="gene">
          <option value="gene">Gene</option>
        </Form.Select>
      </Form.Group>

      <Form.Control
        type="search"
        placeholder="Search gene symbol..."
        value={text}
        onChange={event => setText(event.target.value)}
        autoFocus
      />

      {suggestions.length > 0 && (
        <ListGroup className="mt-1">
          {suggestions.map(symbol => (
            <ListGroup.Item key={symbol} action onClick={() => handleSuggestionClick(symbol)}>
              {symbol}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </Form>
  );
}

export default NewQueryForm;
