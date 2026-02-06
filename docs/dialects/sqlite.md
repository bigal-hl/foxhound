# SQLite Dialect

The SQLite dialect generates SQL compatible with SQLite 3.  It is used together with the Meadow SQLite provider (which uses the `better-sqlite3` driver).

## Identifier Quoting

SQLite uses backtick quoting for identifiers to avoid conflicts with SQLite's many reserved keywords:

```sql
SELECT * FROM Books WHERE `Genre` = :Genre_w0;
```

Table names are not quoted in the SQLite dialect — they are used as plain identifiers.

## Named Parameters

The SQLite dialect uses `:name` syntax for named parameters, which `better-sqlite3` supports natively:

```sql
INSERT INTO Books ( `IDBook`, `Title`, `Author`) VALUES ( NULL, :Title_1, :Author_2);
```

## Timestamp Function

The SQLite dialect generates `NOW()` in its SQL output.  Because SQLite does not have a `NOW()` function, the Meadow SQLite provider replaces this at execution time with `datetime('now')`.

## Pagination

SQLite uses `LIMIT ... OFFSET` syntax:

```sql
-- Cap only
SELECT * FROM Books LIMIT 20;

-- Cap with offset
SELECT * FROM Books LIMIT 20 OFFSET 40;
```

## Joins

The SQLite dialect generates Read queries without join support in the standard code path.  For queries that require joins, use a [query override](query-overrides.md).

## DISTINCT

```sql
SELECT DISTINCT `Genre` FROM Books;
SELECT COUNT(DISTINCT IDBook) AS RowCount FROM Books;
```

## Soft Delete

Works the same as other dialects — when a `Deleted` column is present in the schema, Delete generates an UPDATE:

```sql
UPDATE Books SET `Deleted` = 1, `DeleteDate` = NOW(),
  `UpdateDate` = NOW(), `DeleteIDUser` = :DeleteIDUser_3
  WHERE `IDBook` = :IDBook_w0;
```

The `NOW()` calls are replaced with `datetime('now')` by the Meadow SQLite provider before execution.

## Provider Considerations

When using the Meadow SQLite provider with `better-sqlite3`:

- **Boolean coercion** — `better-sqlite3` only accepts numbers, strings, bigints, buffers, and null. The provider automatically converts boolean values (`true`/`false`) to integers (`1`/`0`)
- **Undefined coercion** — undefined values are converted to `null`
- **Synchronous execution** — `better-sqlite3` is synchronous, but the Meadow provider wraps calls in an async-compatible callback pattern

## Query Overrides

The SQLite dialect supports underscore-style templates for Read and Count queries:

| Variable | Description |
|----------|-------------|
| `<%= FieldList %>` | Generated column list |
| `<%= TableName %>` | Table name |
| `<%= Where %>` | WHERE clause |
| `<%= OrderBy %>` | ORDER BY clause |
| `<%= Limit %>` | LIMIT/OFFSET clause |
| `<%= Distinct %>` | DISTINCT keyword (if set) |
| `<%= _Params %>` | Full parameters object |
