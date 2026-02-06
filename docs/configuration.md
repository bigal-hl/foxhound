# Configuration Reference

This page documents all FoxHound configuration methods, properties, and their accepted values.

## Query Configuration Methods

All setter methods return `this` for chaining.

### setScope(pScope)

Set the primary table or collection for the query.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pScope` | String | Table name |

```javascript
tmpQuery.setScope('Books');
```

### setDialect(pDialectName)

Set the SQL dialect for query generation.

| Parameter | Type | Values |
|-----------|------|--------|
| `pDialectName` | String | `'MySQL'`, `'MSSQL'`, `'SQLite'`, `'ALASQL'`, `'English'`, `'MeadowEndpoints'` |

```javascript
tmpQuery.setDialect('MySQL');
```

### setDataElements(pDataElements)

Set the columns to select.  Pass `false` or omit to select all columns (`*`).

| Parameter | Type | Description |
|-----------|------|-------------|
| `pDataElements` | Array or String | Column name(s) |

```javascript
tmpQuery.setDataElements(['Title', 'Author']);
tmpQuery.setDataElements('Title'); // Wraps in array automatically
```

### setDistinct(pDistinct)

Enable or disable DISTINCT results.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pDistinct` | Boolean | `true` to enable DISTINCT |

### setBegin(pBeginAmount)

Set the pagination starting offset.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pBeginAmount` | Integer ≥ 0 | Zero-based row offset |

### setCap(pCapAmount)

Set the maximum number of rows to return.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pCapAmount` | Integer ≥ 0 | Maximum row count |

### addFilter(pColumn, pValue, pOperator, pConnector, pParameter)

Add a filter expression.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `pColumn` | *(required)* | Column name |
| `pValue` | *(required)* | Comparison value |
| `pOperator` | `'='` | Operator (`=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`, `IN`, `NOT IN`, `IS NULL`, `IS NOT NULL`, `(`, `)`) |
| `pConnector` | `'AND'` | Logical connector (`AND`, `OR`, `NONE`) |
| `pParameter` | `pColumn` | Parameter name |

### setFilter(pFilter)

Replace the entire filter array.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pFilter` | Array or Object | Filter expression(s) |

### addSort(pSort)

Add a sort expression.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSort` | String or Object | Column name or `{Column, Direction}` |

### setSort(pSort)

Replace the entire sort array.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSort` | String, Object, or Array | Sort expression(s) |

### addJoin(pTable, pFrom, pTo, pType)

Add a join expression.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `pTable` | *(required)* | Table to join |
| `pFrom` | *(required)* | Column on join table |
| `pTo` | *(required)* | Column on base table |
| `pType` | `'INNER JOIN'` | Join type |

### setJoin(pJoin)

Replace the entire join array.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pJoin` | Object or Array | Join expression(s) |

### addRecord(pRecord)

Add a record for CREATE or UPDATE operations.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pRecord` | Object | Key-value pairs of column names and values |

### setIDUser(pIDUser)

Set the user ID for audit stamp columns.

| Parameter | Type | Description |
|-----------|------|-------------|
| `pIDUser` | Integer ≥ 0 | User ID |

### setDisableAutoIdentity(pFlag)

Disable automatic identity column handling.

### setDisableAutoDateStamp(pFlag)

Disable automatic timestamp generation.

### setDisableAutoUserStamp(pFlag)

Disable automatic user ID stamping.

### setDisableDeleteTracking(pFlag)

Disable soft-delete behavior.

### setLogLevel(pLogLevel)

Set the query logging verbosity.

| Level | Behavior |
|-------|----------|
| `0` | No logging (default) |
| `1` | Log generated queries |
| `2` | Log queries and non-parameterized versions |
| `3` | Log everything |

## Properties

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `query` | Object | get/set | The generated query (`body`, `schema`, `records`, `parameters`) |
| `result` | Object | get/set | Execution results (`executed`, `value`, `error`) |
| `parameters` | Object | get/set | Full parameters state |
| `dialect` | Object | get | Current dialect object |
| `uuid` | String | get | Unique identifier for this query |
| `logLevel` | Integer | get | Current log level |
| `indexHints` | Array | get/set | Index hints for the database engine |

## Utility Methods

### clone()

Create a new FoxHound query with the same scope, begin, cap, schema, dataElements, sorts, and filters.

```javascript
var tmpClone = tmpQuery.clone();
```

### resetParameters()

Reset the query to its default state.

```javascript
tmpQuery.resetParameters();
```

### mergeParameters(pFromParameters)

Merge an object of parameters into the current state.

```javascript
tmpQuery.mergeParameters({cap: 50, begin: 0});
```

## Build Methods

| Method | Generates |
|--------|-----------|
| `buildCreateQuery()` | INSERT statement |
| `buildReadQuery()` | SELECT statement |
| `buildUpdateQuery()` | UPDATE statement |
| `buildDeleteQuery()` | DELETE or soft-delete UPDATE |
| `buildUndeleteQuery()` | Restore soft-deleted rows |
| `buildCountQuery()` | SELECT COUNT statement |

All build methods return `this` for chaining.  The generated SQL is available at `query.body` and bound parameters at `query.parameters`.
