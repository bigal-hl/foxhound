# Pagination

FoxHound provides dialect-aware pagination through the `setBegin()` and `setCap()` methods.

## Basic Usage

```javascript
// Get the first 20 records
tmpQuery
    .setScope('Books')
    .setCap(20)
    .setDialect('MySQL')
    .buildReadQuery();

// MySQL:  SELECT ... LIMIT 20;
// MSSQL:  SELECT ... OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY;
// SQLite: SELECT ... LIMIT 20;
```

## Offset Pagination

```javascript
// Skip the first 40 records, then get 20
tmpQuery
    .setScope('Books')
    .setBegin(40)
    .setCap(20)
    .setDialect('MySQL')
    .buildReadQuery();

// MySQL:  SELECT ... LIMIT 40, 20;
// MSSQL:  SELECT ... OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY;
// SQLite: SELECT ... LIMIT 20 OFFSET 40;
```

## Methods

### setCap(pCapAmount)

Set the maximum number of records to return.  Must be a non-negative integer.

```javascript
tmpQuery.setCap(50);   // Return at most 50 rows
tmpQuery.setCap(false); // Remove the cap (return all rows)
```

### setBegin(pBeginAmount)

Set the zero-based starting offset.  Must be a non-negative integer.

```javascript
tmpQuery.setBegin(100);  // Start at the 101st record
tmpQuery.setBegin(false); // Remove the offset
```

## Page-Based Pagination Helper

FoxHound doesn't include a built-in page number helper, but it's easy to calculate:

```javascript
var tmpPageSize = 20;
var tmpPageNumber = 3; // Zero-based

tmpQuery
    .setBegin(tmpPageNumber * tmpPageSize)
    .setCap(tmpPageSize);
```

## Dialect Syntax Comparison

| Dialect | Cap Only | Cap + Begin |
|---------|----------|-------------|
| **MySQL** | `LIMIT 20` | `LIMIT 40, 20` |
| **MSSQL** | `OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY` | `OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY` |
| **SQLite** | `LIMIT 20` | `LIMIT 20 OFFSET 40` |
| **ALASQL** | `LIMIT 20` | `LIMIT 20 FETCH 40` |

> **Note:** MSSQL's `OFFSET ... FETCH` syntax requires an `ORDER BY` clause.  If you use pagination with MSSQL, be sure to add at least one sort column.

## No Cap, No Pagination

If `setCap()` is not called (or is set to `false`), no pagination clause is generated and all matching rows are returned.
