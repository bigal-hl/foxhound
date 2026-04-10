# PostgreSQL Dialect

The PostgreSQL dialect generates SQL compatible with PostgreSQL 9.5 and later.

## Identifier Quoting

PostgreSQL uses double-quote quoting for identifiers, which preserves case sensitivity.  Without double quotes, PostgreSQL folds all identifiers to lowercase.  FoxHound quotes all column and table names to ensure case-sensitive operation:

```sql
SELECT "Title", "Author" FROM "Books" WHERE "Genre" = :Genre_w0;
```

Table-qualified field names are quoted on each segment:

```sql
"Books"."Title"
```

## Named Parameters

The PostgreSQL dialect uses `:name` syntax for named parameters:

```sql
INSERT INTO "Books" ( "Title", "Author") VALUES ( :Title_0, :Author_1);
```

The bound values are stored in `query.parameters` as a plain object:

```javascript
{ Title_0: 'Dune', Author_1: 'Frank Herbert' }
```

## Timestamp Function

PostgreSQL uses `NOW()` for timestamp generation.  Unlike MySQL's `NOW(3)`, PostgreSQL's `NOW()` natively provides microsecond precision.

## Pagination

PostgreSQL uses `LIMIT ... OFFSET` syntax:

```sql
-- Cap only
SELECT "Books".* FROM "Books" LIMIT 20;

-- Cap with offset
SELECT "Books".* FROM "Books" LIMIT 20 OFFSET 40;
```

## AutoIdentity on INSERT

The PostgreSQL dialect uses `DEFAULT` for AutoIdentity columns on INSERT, allowing PostgreSQL `SERIAL` or `IDENTITY` columns to auto-assign values:

```sql
INSERT INTO "Books" ( "IDBook", "Title") VALUES ( DEFAULT, :Title_1) RETURNING *;
```

## RETURNING Clause

All INSERT statements include `RETURNING *`, which returns the full inserted row -- including any auto-generated values like serial IDs and default timestamps.

## Joins

```sql
INNER JOIN Authors ON Authors.IDAuthor = Books.IDAuthor
LEFT JOIN Publishers ON Publishers.IDPublisher = Books.IDPublisher
```

## DISTINCT

```sql
SELECT DISTINCT "Genre" FROM "Books";
SELECT COUNT(DISTINCT "Books"."IDBook") AS RowCount FROM "Books";
```

## Case Sensitivity

PostgreSQL treats unquoted identifiers as case-insensitive (folded to lowercase).  The FoxHound PostgreSQL dialect wraps all column and table names in double quotes to preserve the exact case of your schema definitions.  This is important when your schema uses mixed-case column names like `IDBook`, `CreateDate`, or `UpdatingIDUser`.

If your PostgreSQL tables were created with quoted identifiers:

```sql
CREATE TABLE "Books" (
    "IDBook" SERIAL PRIMARY KEY,
    "Title" VARCHAR(255),
    "PublishedYear" INTEGER
);
```

Then FoxHound's quoted queries will match these column names correctly.

## Soft Delete

When a schema has a `Deleted` column type, the Delete operation generates an UPDATE:

```sql
UPDATE "Books" SET "Deleted" = 1, "DeleteDate" = NOW(),
  "UpdateDate" = NOW(), "DeleteIDUser" = :DeleteIDUser_3
  WHERE "IDBook" = :IDBook_w0;
```

## Query Overrides

The PostgreSQL dialect supports underscore-style templates for Read and Count queries:

| Variable | Description |
|----------|-------------|
| `<%= FieldList %>` | Generated column list with double-quote quoting |
| `<%= TableName %>` | Table name with double-quote quoting |
| `<%= Where %>` | WHERE clause (including the keyword) |
| `<%= Join %>` | JOIN clauses |
| `<%= OrderBy %>` | ORDER BY clause |
| `<%= Limit %>` | LIMIT/OFFSET clause |
| `<%= Distinct %>` | DISTINCT keyword (if set) |
| `<%= _Params %>` | Full parameters object |

## Comparison with Other Dialects

| Feature | PostgreSQL | MySQL | MSSQL |
|---------|-----------|-------|-------|
| Identifier quoting | `"double quotes"` | `` `backticks` `` | `[brackets]` |
| Parameter prefix | `:name` | `:name` | `@name` |
| Timestamp function | `NOW()` | `NOW(3)` | `GETUTCDATE()` |
| AutoIdentity INSERT | `DEFAULT` | `NULL` | column omitted |
| INSERT return | `RETURNING *` | none | none |
| Pagination | `LIMIT n OFFSET m` | `LIMIT m, n` | `OFFSET m ROWS FETCH NEXT n ROWS ONLY` |
| Case sensitivity | case-sensitive (quoted) | case-insensitive | case-insensitive |
