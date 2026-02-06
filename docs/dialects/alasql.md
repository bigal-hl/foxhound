# ALASQL Dialect

The ALASQL dialect generates SQL compatible with [ALASQL](https://github.com/AlaSQL/alasql), a JavaScript SQL database for browser and Node.js that works with in-memory data.

## Overview

ALASQL is ideal for:

- Browser-side data querying
- In-memory datasets
- Client-side filtering and aggregation
- Prototyping without a database server

## Identifier Quoting

ALASQL uses backtick quoting for identifiers (same as SQLite):

```sql
SELECT * FROM Books WHERE `Genre` = :Genre_w0;
```

Table names are used as plain identifiers without quoting.

## Named Parameters

The ALASQL dialect uses `:name` syntax for named parameters:

```sql
SELECT `Title`, `Author` FROM Books WHERE `Genre` = :Genre_w0 ORDER BY `Title`;
```

## Timestamp Function

The ALASQL dialect generates `NOW()` for timestamp columns.  Depending on your ALASQL configuration, you may need to register a custom `NOW()` function.

## Pagination

ALASQL uses `LIMIT ... FETCH` syntax:

```sql
-- Cap only
SELECT * FROM Books LIMIT 20;

-- Cap with offset
SELECT * FROM Books LIMIT 20 FETCH 40;
```

> **Note:** The `FETCH` keyword here is ALASQL-specific and represents the starting offset.  This differs from the standard SQL `FETCH NEXT` clause used by MSSQL.

## Joins

Like SQLite, the ALASQL dialect does not include built-in join generation.  For queries that require joins, use a [query override](query-overrides.md).

## Similarities to SQLite

The ALASQL dialect shares most of its implementation with the SQLite dialect:

- Same identifier quoting (backticks)
- Same parameter syntax (`:name`)
- Same column escaping logic
- Same schema-aware column handling
- Same soft-delete behavior

The primary differences are:

| Feature | SQLite | ALASQL |
|---------|--------|--------|
| Pagination | `LIMIT n OFFSET m` | `LIMIT n FETCH m` |
| Runtime | Native C library via better-sqlite3 | Pure JavaScript |
| Use case | Embedded/file databases | In-memory/browser |

## Query Overrides

The ALASQL dialect supports the same template variables as SQLite:

| Variable | Description |
|----------|-------------|
| `<%= FieldList %>` | Generated column list |
| `<%= TableName %>` | Table name |
| `<%= Where %>` | WHERE clause |
| `<%= OrderBy %>` | ORDER BY clause |
| `<%= Limit %>` | LIMIT/FETCH clause |
| `<%= Distinct %>` | DISTINCT keyword (if set) |
| `<%= _Params %>` | Full parameters object |
