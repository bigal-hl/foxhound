# Filters

Filters are the WHERE clause of your query.  FoxHound supports a rich set of comparison operators, logical connectors, and grouping expressions.

## Adding a Filter

The simplest way to add a filter is with `addFilter()`:

```javascript
tmpQuery.addFilter('Genre', 'Science Fiction');
// WHERE Genre = :Genre_w0
```

The full signature is:

```javascript
addFilter(pColumn, pValue, pOperator, pConnector, pParameter)
```

| Argument | Default | Description |
|----------|---------|-------------|
| `pColumn` | *(required)* | Column name |
| `pValue` | *(required)* | Value to compare against |
| `pOperator` | `'='` | Comparison operator |
| `pConnector` | `'AND'` | Logical connector to the previous filter |
| `pParameter` | `pColumn` | Parameter name (auto-generated, usually leave as default) |

## Comparison Operators

| Operator | SQL | Description |
|----------|-----|-------------|
| `'='` | `=` | Equals (default) |
| `'!='` | `!=` | Not equals |
| `'>'` | `>` | Greater than |
| `'>='` | `>=` | Greater than or equal |
| `'<'` | `<` | Less than |
| `'<='` | `<=` | Less than or equal |
| `'LIKE'` | `LIKE` | Pattern match |
| `'IN'` | `IN (...)` | Value in a set |
| `'NOT IN'` | `NOT IN (...)` | Value not in a set |
| `'IS NULL'` | `IS NULL` | Null check (no value needed) |
| `'IS NOT NULL'` | `IS NOT NULL` | Not-null check (no value needed) |

## Logical Connectors

| Connector | Description |
|-----------|-------------|
| `'AND'` | Both conditions must be true (default) |
| `'OR'` | Either condition may be true |
| `'NONE'` | No connector (used internally) |

## Examples

### Multiple Filters

```javascript
tmpQuery
    .addFilter('Genre', 'Science Fiction')
    .addFilter('PublishedYear', 2000, '>');

// WHERE Genre = :Genre_w0 AND PublishedYear > :PublishedYear_w1
```

### OR Connector

```javascript
tmpQuery
    .addFilter('Genre', 'Science Fiction')
    .addFilter('Genre', 'Fantasy', '=', 'OR');

// WHERE Genre = :Genre_w0 OR Genre = :Genre_w1
```

### LIKE Operator

```javascript
tmpQuery.addFilter('Title', '%Dune%', 'LIKE');

// WHERE Title LIKE :Title_w0
```

### IN Operator

```javascript
tmpQuery.addFilter('Status', 'Active,Pending', 'IN');

// WHERE Status IN ( :Status_w0 )
```

### IS NULL / IS NOT NULL

```javascript
tmpQuery.addFilter('DeleteDate', '', 'IS NULL');
tmpQuery.addFilter('Title', '', 'IS NOT NULL');

// WHERE DeleteDate IS NULL AND Title IS NOT NULL
```

### Grouped Conditions (Parentheses)

Use the `(` and `)` operators to create logical groups:

```javascript
tmpQuery
    .addFilter('', '', '(')
    .addFilter('Genre', 'Science Fiction')
    .addFilter('Genre', 'Fantasy', '=', 'OR')
    .addFilter('', '', ')')
    .addFilter('PublishedYear', 2000, '>');

// WHERE ( Genre = :Genre_w1 OR Genre = :Genre_w2 ) AND PublishedYear > :PublishedYear_w4
```

## Setting Filters Directly

For full control, you can set the entire filter array at once with `setFilter()`:

```javascript
tmpQuery.setFilter([
    {Column: 'Genre', Operator: '=', Value: 'Science Fiction', Connector: 'AND', Parameter: 'Genre'},
    {Column: 'PublishedYear', Operator: '>', Value: 2000, Connector: 'AND', Parameter: 'PublishedYear'}
]);
```

## Filter Object Structure

Each filter in the array is an object with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `Column` | String | The column to filter on |
| `Operator` | String | Comparison operator |
| `Value` | Any | The value to compare against |
| `Connector` | String | Logical connector (`AND`, `OR`, `NONE`) |
| `Parameter` | String | Named parameter key |

## URL Serialization Format

When filters are passed through URL query strings (as in Meadow endpoints), they use a serialized format:

```
FBV~Genre~EQ~Science Fiction~FBV~PublishedYear~GT~2000
```

The instruction types are:

| Code | Meaning |
|------|---------|
| `FBV` | Filter By Value |
| `FBL` | Filter By List (comma-separated values) |
| `FOP` | Filter Open Parenthesis |
| `FCP` | Filter Close Parenthesis |
| `FSF` | Filter Sort Field |
| `FCC` | Filter Constraint Cap |
| `FCB` | Filter Constraint Begin |

The operator codes are:

| Code | Operator |
|------|----------|
| `EQ` | `=` |
| `NE` | `!=` |
| `GT` | `>` |
| `GE` | `>=` |
| `LT` | `<` |
| `LE` | `<=` |
| `LK` | `LIKE` |

## JSON Path Filtering

When a schema is attached and contains `JSON` or `JSONProxy` columns, you can filter on nested JSON properties using dot notation:

```javascript
// Filter where Metadata.habitat equals 'forest'
tmpQuery.addFilter('Metadata.habitat', 'forest');

// Filter where Metadata.weight is greater than 100
tmpQuery.addFilter('Metadata.weight', 100, '>');

// Nested paths work too
tmpQuery.addFilter('Metadata.dimensions.height', 50, '>=');
```

FoxHound detects the dot notation, resolves the base column against the schema, and generates the appropriate JSON path expression for the active dialect:

| Dialect | Single-Level | Nested |
|---------|-------------|--------|
| MySQL | `JSON_EXTRACT(col, '$.key')` | `JSON_EXTRACT(col, '$.key1.key2')` |
| PostgreSQL | `col->>'key'` | `col#>>'{key1,key2}'` |
| SQLite | `json_extract(col, '$.key')` | `json_extract(col, '$.key1.key2')` |
| MSSQL | `JSON_VALUE(col, '$.key')` | `JSON_VALUE(col, '$.key1.key2')` |

For `JSONProxy` columns, the storage column name is used in the SQL expression automatically. For example, if `Preferences` is a `JSONProxy` with `StorageColumn: 'PreferencesJSON'`, filtering on `Preferences.theme` produces `json_extract(PreferencesJSON, '$.theme')` in SQLite.

All standard comparison operators (`=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`) work with JSON path filters.

## Soft-Delete Auto-Filter

When a schema with a `Deleted` column type is present and delete tracking is not disabled, FoxHound automatically appends a `WHERE Deleted = 0` filter to all Read and Count queries.  If you explicitly add a filter on the `Deleted` column, the automatic filter is suppressed.
