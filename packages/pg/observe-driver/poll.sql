/*
 * Template for refreshing a result set, only returning unknown rows
 * Accepts 2 arguments:
 * query: original query string
 * hashParam: count of params in original query + 1. This is used to
 * pass hashes as the last argument. Since the original $$query$$ can
 * expand to something that accepts arguments (contain $1, $2, etc),
 * it is important to expand this to $3 or whatever the last argument
 * index is.
 */
WITH
  query_result AS ($$query$$),
  result_with_hashes AS (
    SELECT
      query_result.*,
      MD5(CAST(ROW_TO_JSON(query_result.*) AS TEXT)) AS _hash
    FROM query_result)

SELECT
  result_with_hashes.*
FROM data
WHERE NOT (_hash = ANY (
  /* NOTE the tripple dollar on the left */
  $$$hashParam$$))
