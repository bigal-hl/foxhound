# Dialects Overview

FoxHound uses a dialect strategy pattern to generate database-specific SQL from the same query configuration.  Each dialect is a self-contained module that translates FoxHound's internal parameters into the target SQL syntax.

## Available Dialects

| Dialect | Target | Identifier Quoting | Parameter Prefix | Pagination |
|---------|--------|-------------------|-----------------|------------|
| [MySQL](dialects/mysql.md) | MySQL / MariaDB | `` `backticks` `` | `:name` | `LIMIT offset, count` |
| [PostgreSQL](dialects/postgresql.md) | PostgreSQL 9.5+ | `"double quotes"` | `:name` | `LIMIT count OFFSET offset` |
| [MSSQL](dialects/mssql.md) | Microsoft SQL Server | `[brackets]` | `@name` | `OFFSET n ROWS FETCH NEXT m ROWS ONLY` |
| [SQLite](dialects/sqlite.md) | SQLite 3 | `` `backticks` `` | `:name` | `LIMIT count OFFSET offset` |
| [ALASQL](dialects/alasql.md) | ALASQL (in-memory) | `` `backticks` `` | `:name` | `LIMIT count FETCH offset` |
| English | Human-readable | none | none | prose |
| MeadowEndpoints | REST URL generation | none | none | query string |

## Setting a Dialect

```javascript
tmpQuery.setDialect('MySQL');
```

If no dialect is set before building a query, FoxHound defaults to `English`.

If an invalid dialect name is passed, FoxHound logs an error and falls back to `English`.

## Dialect Interface

Every dialect exports a factory function that accepts a Fable instance and returns an object with six methods:

```javascript
{
    Create: function(pParameters) { ... },
    Read:   function(pParameters) { ... },
    Update: function(pParameters) { ... },
    Delete: function(pParameters) { ... },
    Undelete: function(pParameters) { ... },
    Count:  function(pParameters) { ... }
}
```

Each method receives the full Parameters object and returns a SQL string (or `false` if the query cannot be generated).

## Common Behaviors

All SQL dialects share these behaviors:

- **Parameterized values** -- user data is always bound as named parameters, never interpolated
- **Schema-aware column management** -- AutoIdentity, timestamps, user stamps, and soft-delete columns are handled automatically based on schema type annotations
- **Soft-delete filtering** -- Read and Count queries automatically exclude rows where the `Deleted` column is `1` (when schema is present)
- **Query overrides** -- Read and Count queries support underscore templates for custom SQL generation

## Choosing a Dialect

| Use Case | Recommended Dialect |
|----------|-------------------|
| Production MySQL/MariaDB | `MySQL` |
| Production PostgreSQL | `PostgreSQL` |
| Production SQL Server | `MSSQL` |
| Embedded/file-based database | `SQLite` |
| Browser-side or in-memory queries | `ALASQL` |
| Debugging/logging | `English` |
| REST API URL generation | `MeadowEndpoints` |
