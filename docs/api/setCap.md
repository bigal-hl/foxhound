# setCap / setBegin

Set pagination limits and offsets.

## setCap

Set the maximum number of rows to return (LIMIT).

### Signature

```javascript
tmpQuery.setCap(pCapAmount)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pCapAmount` | Integer or false | Maximum row count (must be >= 0), or `false` to remove |

### Returns

Returns `this` for chaining.

### Examples

```javascript
// Return at most 50 rows
tmpQuery.setCap(50);

// Remove the cap (return all rows)
tmpQuery.setCap(false);
```

## setBegin

Set the zero-based starting offset (OFFSET / SKIP).

### Signature

```javascript
tmpQuery.setBegin(pBeginAmount)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pBeginAmount` | Integer or false | Zero-based row offset (must be >= 0), or `false` to remove |

### Returns

Returns `this` for chaining.

### Examples

```javascript
// Start at the 101st record
tmpQuery.setBegin(100);

// Remove the offset
tmpQuery.setBegin(false);
```

## Pagination Examples

### First page

```javascript
tmpQuery
	.setScope('Books')
	.setCap(20)
	.setDialect('MySQL')
	.buildReadQuery();

// MySQL:      SELECT ... LIMIT 20;
// PostgreSQL: SELECT ... LIMIT 20;
// MSSQL:      SELECT ... OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY;
```

### Second page

```javascript
tmpQuery
	.setScope('Books')
	.setBegin(20)
	.setCap(20)
	.setDialect('MySQL')
	.buildReadQuery();

// MySQL:      SELECT ... LIMIT 20, 20;
// PostgreSQL: SELECT ... LIMIT 20 OFFSET 20;
// MSSQL:      SELECT ... OFFSET 20 ROWS FETCH NEXT 20 ROWS ONLY;
```

### Page-based helper

```javascript
var tmpPageSize = 20;
var tmpPageNumber = 3; // zero-based

tmpQuery
	.setBegin(tmpPageNumber * tmpPageSize)
	.setCap(tmpPageSize);
```

## Dialect Syntax

| Dialect | Cap Only | Cap + Offset |
|---------|----------|--------------|
| MySQL | `LIMIT 20` | `LIMIT 40, 20` |
| PostgreSQL | `LIMIT 20` | `LIMIT 20 OFFSET 40` |
| MSSQL | `OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY` | `OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY` |
| SQLite | `LIMIT 20` | `LIMIT 20 OFFSET 40` |
| ALASQL | `LIMIT 20` | `LIMIT 20 FETCH 40` |
