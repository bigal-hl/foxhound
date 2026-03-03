# addSort / setSort

Add or replace sort expressions for the ORDER BY clause.

## addSort

Add a single sort expression to the existing sort array.

### Signature

```javascript
tmpQuery.addSort(pSort)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSort` | String or Object | Column name (ascending by default) or sort object |

### Returns

Returns `this` for chaining.

### Examples

#### Sort ascending by column name

```javascript
tmpQuery.addSort('PublishedYear');
// ORDER BY PublishedYear
```

#### Sort descending

```javascript
tmpQuery.addSort({Column: 'PublishedYear', Direction: 'Descending'});
// ORDER BY PublishedYear DESC
```

#### Multiple sort columns

```javascript
tmpQuery
	.addSort({Column: 'Genre', Direction: 'Ascending'})
	.addSort({Column: 'PublishedYear', Direction: 'Descending'});
// ORDER BY Genre, PublishedYear DESC
```

## setSort

Replace the entire sort array.

### Signature

```javascript
tmpQuery.setSort(pSort)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pSort` | String, Object, or Array | Sort expression(s) |

### Examples

#### Single string

```javascript
tmpQuery.setSort('Title');
// ORDER BY Title
```

#### Single object

```javascript
tmpQuery.setSort({Column: 'Title', Direction: 'Descending'});
// ORDER BY Title DESC
```

#### Array of sort expressions

```javascript
tmpQuery.setSort([
	{Column: 'Genre', Direction: 'Ascending'},
	{Column: 'Title', Direction: 'Ascending'}
]);
// ORDER BY Genre, Title
```

## Sort Object Structure

| Property | Type | Values | Description |
|----------|------|--------|-------------|
| `Column` | String | Any column name | Column to sort by |
| `Direction` | String | `'Ascending'` or `'Descending'` | Sort direction (default: Ascending) |

## Dialect Quoting

Each dialect quotes the column name in ORDER BY according to its conventions:

```javascript
tmpQuery.addSort('PublishedYear');

// MySQL:      ORDER BY PublishedYear
// PostgreSQL: ORDER BY "PublishedYear"
// MSSQL:      ORDER BY [PublishedYear]
```
