# Query Overrides

Supply custom SQL templates for Read and Count queries while retaining automatic parameter binding.

## Setting a Query Override

```javascript
tmpQuery.parameters.queryOverride =
	'SELECT <%= FieldList %> FROM <%= TableName %> <%= Where %> GROUP BY Genre <%= OrderBy %> <%= Limit %>';
```

Or via Meadow's raw query system:

```javascript
myMeadow.rawQueries.setQuery('Read',
	'SELECT <%= FieldList %> FROM <%= TableName %> <%= Join %> <%= Where %> GROUP BY Genre <%= OrderBy %> <%= Limit %>');
```

## How It Works

A query override is an underscore-style template string.  FoxHound generates the individual clauses (field list, WHERE, JOINs, etc.) and then passes them into your template as variables.

## Template Variables

| Variable | Type | Description |
|----------|------|-------------|
| `<%= FieldList %>` | String | Comma-separated field list (with dialect-specific quoting) |
| `<%= TableName %>` | String | Quoted table name |
| `<%= Where %>` | String | Full WHERE clause including the keyword, or empty string |
| `<%= Join %>` | String | All JOIN clauses, or empty string |
| `<%= OrderBy %>` | String | ORDER BY clause including the keyword, or empty string |
| `<%= Limit %>` | String | Pagination clause (dialect-specific), or empty string |
| `<%= IndexHints %>` | String | Index hint clause (MySQL/MSSQL), or empty string |
| `<%= Distinct %>` | String | The `DISTINCT` keyword if set, or empty string |
| `<%= _Params %>` | Object | The full Parameters object for advanced access |

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

### Custom aggregation

```javascript
tmpQuery.parameters.queryOverride =
	'SELECT Author, AVG(Rating) as AvgRating FROM <%= TableName %> <%= Where %> GROUP BY Author HAVING AVG(Rating) > 4.0 <%= OrderBy %>';
```

### Accessing the full parameters object

```javascript
tmpQuery.parameters.queryOverride =
	'SELECT * FROM <%= TableName %> WHERE IDBook > <%= _Params.begin %>';
```

## Scope

Query overrides apply to **Read** and **Count** operations only.  Create, Update, Delete, and Undelete always use the standard generation path.

## Error Handling

If a query override template fails to compile or execute, FoxHound catches the error, logs it, and returns `false` for the query body.

## When to Use

- `GROUP BY` clauses
- Subqueries
- Custom aggregations (`SUM`, `AVG`, `MAX`, `MIN`)
- `HAVING` clauses
- `UNION` queries
- Any SQL feature not directly supported by the fluent API
