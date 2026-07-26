// PubMed E-utilities — CORS-clean, but unauthenticated (no API key) 3 req/sec cap. Rapid
// repeated calls can transiently fail with "TypeError: Failed to fetch" even though nothing
// is actually broken — callers should tolerate/retry that rather than treat it as a hard error.

export async function searchPubMed(query) {
  try {
    // encodeURIComponent escapes characters in `query` (spaces, parentheses, &, etc.) so
    // they're treated as literal text in the search term instead of breaking the URL's
    // own syntax (e.g. an unescaped "&" would look like the start of the next query param).
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=10`
    );
    const searchData = await searchRes.json();

    const ids = searchData.esearchresult?.idlist ?? [];
    if (ids.length === 0) {
      console.warn(`[PubMed esearch] "${query}" returned no results`);
      return null;
    }

    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
    );
    return await summaryRes.json();
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
