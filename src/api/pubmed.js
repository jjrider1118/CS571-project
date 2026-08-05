// PubMed E-utilities — CORS-clean, but unauthenticated (no API key) 3 req/sec cap.
// Exceeding it doesn't throw or reject — NCBI just returns a non-JSON error body,
// which fails at the `.json()` call below and looks identical to a network failure.
// throttledFetch enforces spacing between EVERY outgoing request (across calls,
// not just within one), since callers now fire these eagerly for every species
// in a query rather than one at a time on demand.
const MIN_REQUEST_INTERVAL_MS = 400; // ~2.5 req/sec, safely under the 3 req/sec cap
let lastRequestTime = 0;

async function throttledFetch(url) {
  const wait = lastRequestTime + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) {
    await new Promise(resolve => setTimeout(resolve, wait));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

// Returns { totalCount, summaryResponse } on success (summaryResponse is null
// when the search itself matched zero PMIDs — that's a real "0 references"
// result, not a failure) or null if the request itself failed (network/CORS).
export async function searchPubMed(query) {
  try {
    // encodeURIComponent escapes characters in `query` (spaces, parentheses, &, etc.) so
    // they're treated as literal text in the search term instead of breaking the URL's
    // own syntax (e.g. an unescaped "&" would look like the start of the next query param).
    const searchRes = await throttledFetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=10`
    );
    const searchData = await searchRes.json();

    const ids = searchData.esearchresult?.idlist ?? [];
    // "count" is PubMed's true total match count, independent of the retmax=10
    // cap on idlist — that cap only limits how many summaries we fetch below.
    const totalCount = Number(searchData.esearchresult?.count ?? ids.length);

    if (ids.length === 0) {
      return { totalCount, summaryResponse: null };
    }

    const summaryRes = await throttledFetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
    );
    return { totalCount, summaryResponse: await summaryRes.json() };
  } catch (err) {
    console.error(`[PubMed] "${query}" FAILED (likely CORS/network):`, err);
    return null;
  }
}

export function parsePubMedSummary(summaryResponse) {
  const result = summaryResponse?.result;
  if (!result) return [];

  return (result.uids ?? []).map(uid => {
    const article = result[uid];
    const doi = article.articleids?.find(id => id.idtype === "doi")?.value ?? null;
    return {
      pmid: uid,
      title: article.title,
      authors: (article.authors ?? []).map(a => a.name),
      journal: article.fulljournalname,
      pubDate: article.pubdate,
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
    };
  });
}
