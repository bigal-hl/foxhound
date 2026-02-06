# Query Overrides

Query overrides let you supply a custom SQL template while still benefiting from FoxHound's automatic parameter binding, filter generation, and schema awareness.

## How It Works

A query override is an [underscore-style template](https://underscorejs.org/#template) string.  FoxHound generates the individual clauses (field list, where, joins, etc.) and then passes them into your template.

## Setting a Query Override

```javascript
tmpQuery.parameters.queryOverride =
    'SELECT <%= FieldList %> FROM <%= TableName %> <%= Join %> <%= Where %> <%= OrderBy %> <%= Limit %>';
```

Or via Meadow's raw query system:

```javascript
myMeadow.rawQueries.setQuery('Read',
    'SELECT <%= FieldList %> FROM <%= TableName %> <%= Join %> <%= Where %> GROUP BY Genre <%= OrderBy %> <%= Limit %>');
```

## Available Template Variables

| Variable | Type | Description |
|----------|------|-------------|
| `FieldList` | String | Comma-separated field list (e.g. `` `Title`, `Author` ``) |
| `TableName` | String | Quoted table name (e.g. `` `Books` `` or `[Books]`) |
| `Where` | String | Full WHERE clause including the keyword (e.g. `WHERE Genre = :Genre_w0`) |
| `Join` | String | All JOIN clauses (e.g. `INNER JOIN Authors ON ...`) |
| `OrderBy` | String | ORDER BY clause including the keyword |
| `Limit` | String | Pagination clause (dialect-specific) |
| `IndexHints` | String | Index hint clause (MySQL/MSSQL only) |
| `Distinct` | String | The `DISTINCT` keyword if set, otherwise empty |
| `_Params` | Object | The full Parameters object for advanced access |

## Examples

### GROUP BY

```javascript
tmpQuery.parameters.queryOverride =
    'SELECT Genre, COUNT(*) as BookCount FROM <%= TableName %> <%= Where %> GROUP BY Genre <%= OrderBy %>';
```

### Subquery

```javascript
tmpQuery.parameters.queryOverride =
    'SELECT <%= FieldList %> FROM <%= TableName %> <%= Where %> AND PublishedYear = (SELECT MAX(PublishedYear) FROM <%= TableName %>)';
```

### Custom Aggregation

```javascript
tmpQuery.parameters.queryOverride =
    'SELECT Author, AVG(Rating) as AvgRating FROM <%= TableName %> <%= Where %> GROUP BY Author HAVING AVG(Rating) > 4.0 <%= OrderBy %>';
```

### Accessing Parameters

The `_Params` variable gives you access to the full query state:

```javascript
tmpQuery.parameters.queryOverride =
    'SELECT * FROM <%= TableName %> WHERE IDBook > <%= _Params.begin %>';
```

## Override Scope

Query overrides apply to **Read** and **Count** operations only.  Create, Update, Delete, and Undelete operations always use the standard generation path.

## Error Handling

If a query override template fails to compile or execute, FoxHound catches the error, logs it to the console, and returns `false` for the query body.  This prevents template errors from crashing your application.

## When to Use Query Overrides

Query overrides are useful when you need:

- `GROUP BY` clauses
- Subqueries
- Custom aggregations (`SUM`, `AVG`, `MAX`, `MIN`)
- `HAVING` clauses
- `UNION` queries
- Any SQL feature not directly supported by FoxHound's fluent API

For straightforward CRUD operations, the standard query builders are preferred — they are safer and more portable across dialects.
