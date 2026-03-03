# setDialect

Set the SQL dialect used for query generation.

## Signature

```javascript
tmpQuery.setDialect(pDialectName)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pDialectName` | String | Yes | Name of the dialect |

## Returns

Returns `this` for chaining.

## Available Dialects

| Name | Target Database |
|------|----------------|
| `'MySQL'` | MySQL / MariaDB |
| `'PostgreSQL'` | PostgreSQL 9.5+ |
| `'MSSQL'` | Microsoft SQL Server |
| `'SQLite'` | SQLite 3 |
| `'ALASQL'` | ALASQL (in-memory JavaScript) |
| `'English'` | Human-readable text (default) |
| `'MeadowEndpoints'` | REST URL generation |
| `'MongoDB'` | MongoDB query objects |
| `'DGraph'` | DGraph graph queries |
| `'Solr'` | Apache Solr search |

## Description

The dialect determines how FoxHound translates the internal query parameters into database-specific syntax.  This includes identifier quoting, parameter prefixes, pagination syntax, timestamp functions, and auto-identity handling.

If an invalid dialect name is passed, FoxHound logs an error and falls back to the `English` dialect.

## Examples

### Basic usage

```javascript
tmpQuery.setDialect('MySQL');
```

### Same query, different dialects

```javascript
var tmpQuery = libFoxHound.new(_Fable)
	.setScope('Books')
	.addFilter('Genre', 'Fantasy')
	.setCap(10);

tmpQuery.setDialect('MySQL').buildReadQuery();
console.log(tmpQuery.query.body);
// => SELECT `Books`.* FROM `Books` WHERE `Books`.`Genre` = :Genre_w0 LIMIT 10;

tmpQuery.setDialect('PostgreSQL').buildReadQuery();
console.log(tmpQuery.query.body);
// => SELECT "Books".* FROM "Books" WHERE "Genre" = :Genre_w0 LIMIT 10;

tmpQuery.setDialect('MSSQL').buildReadQuery();
console.log(tmpQuery.query.body);
// => SELECT [Books].* FROM [Books] WHERE Genre = @Genre_w0
//    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;
```

### Checking the active dialect

```javascript
tmpQuery.setDialect('PostgreSQL');
console.log(tmpQuery.dialect.name);
// => 'PostgreSQL'
```
