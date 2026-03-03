# setScope

Set the primary table or collection for the query.

## Signature

```javascript
tmpQuery.setScope(pScope)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pScope` | String | Yes | Table or collection name |

## Returns

Returns `this` for chaining.

## Description

The scope defines which table (or collection, in NoSQL dialects) the query targets.  This is required for all query types — it appears as the `FROM` clause in SELECT, `INSERT INTO` in CREATE, `UPDATE` in UPDATE, and `DELETE FROM` in DELETE.

FoxHound validates that the input is a string.  Non-string values are ignored and an error is logged.

## Examples

### Basic usage

```javascript
tmpQuery.setScope('Books');
```

### With dialect quoting

Each dialect quotes the scope name according to its conventions:

```javascript
// MySQL
tmpQuery.setScope('Books').setDialect('MySQL').buildReadQuery();
// => SELECT `Books`.* FROM `Books`;

// PostgreSQL
tmpQuery.setScope('Books').setDialect('PostgreSQL').buildReadQuery();
// => SELECT "Books".* FROM "Books";

// MSSQL
tmpQuery.setScope('Books').setDialect('MSSQL').buildReadQuery();
// => SELECT [Books].* FROM [Books];
```

### Pre-quoted scope

If the scope is already quoted for your dialect, FoxHound preserves it:

```javascript
tmpQuery.setScope('"MySchema"."Books"');
// PostgreSQL will use: "MySchema"."Books"
```

### Chaining

```javascript
tmpQuery
	.setScope('Books')
	.setDataElements(['Title', 'Author'])
	.setDialect('MySQL')
	.buildReadQuery();
```
