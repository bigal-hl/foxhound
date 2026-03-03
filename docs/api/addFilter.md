# addFilter / setFilter

Add or replace filter conditions for the WHERE clause.

## addFilter

Add a single filter expression to the existing filter array.

### Signature

```javascript
tmpQuery.addFilter(pColumn, pValue, pOperator, pConnector, pParameter)
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pColumn` | String | *(required)* | Column name |
| `pValue` | Any | *(required)* | Value to compare against |
| `pOperator` | String | `'='` | Comparison operator |
| `pConnector` | String | `'AND'` | Logical connector (`AND`, `OR`, `NONE`) |
| `pParameter` | String | `pColumn` | Parameter name for bound values |

### Returns

Returns `this` for chaining.

### Examples

#### Simple equality filter

```javascript
tmpQuery.addFilter('Genre', 'Science Fiction');
// WHERE Genre = :Genre_w0
```

#### Greater than

```javascript
tmpQuery.addFilter('PublishedYear', 2000, '>');
// WHERE PublishedYear > :PublishedYear_w0
```

#### OR connector

```javascript
tmpQuery
	.addFilter('Genre', 'Science Fiction')
	.addFilter('Genre', 'Fantasy', '=', 'OR');
// WHERE Genre = :Genre_w0 OR Genre = :Genre_w1
```

#### LIKE operator

```javascript
tmpQuery.addFilter('Title', '%Dune%', 'LIKE');
// WHERE Title LIKE :Title_w0
```

#### IN operator

```javascript
tmpQuery.addFilter('IDOffice', [10, 11, 15, 18], 'IN');
// WHERE IDOffice IN ( :IDOffice_w0 )
```

#### NOT IN operator

```javascript
tmpQuery.addFilter('Status', ['Deleted', 'Archived'], 'NOT IN');
// WHERE Status NOT IN ( :Status_w0 )
```

#### IS NULL / IS NOT NULL

```javascript
tmpQuery.addFilter('DeleteDate', '', 'IS NULL');
// WHERE DeleteDate IS NULL

tmpQuery.addFilter('Title', '', 'IS NOT NULL');
// WHERE Title IS NOT NULL
```

#### Grouped conditions with parentheses

```javascript
tmpQuery
	.addFilter('', '', '(')
	.addFilter('Genre', 'Science Fiction')
	.addFilter('Genre', 'Fantasy', '=', 'OR')
	.addFilter('', '', ')')
	.addFilter('PublishedYear', 2000, '>');
// WHERE ( Genre = :Genre_w1 OR Genre = :Genre_w2 )
//   AND PublishedYear > :PublishedYear_w4
```

#### Custom parameter name

```javascript
tmpQuery.addFilter('Books.Genre', 'Fantasy', '=', 'AND', 'BookGenre');
// WHERE Books.Genre = :BookGenre_w0
```

## setFilter

Replace the entire filter array.

### Signature

```javascript
tmpQuery.setFilter(pFilter)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pFilter` | Object or Array | Filter expression(s) |

### Examples

#### Single filter object

```javascript
tmpQuery.setFilter({
	Column: 'Genre',
	Operator: '=',
	Value: 'Fantasy',
	Connector: 'AND',
	Parameter: 'Genre'
});
```

#### Multiple filters

```javascript
tmpQuery.setFilter([
	{Column: 'Genre', Operator: '=', Value: 'Fantasy', Connector: 'AND', Parameter: 'Genre'},
	{Column: 'PublishedYear', Operator: '>', Value: 2000, Connector: 'AND', Parameter: 'PublishedYear'}
]);
```

## Filter Object Structure

| Property | Type | Description |
|----------|------|-------------|
| `Column` | String | Column name to filter on |
| `Operator` | String | Comparison operator |
| `Value` | Any | Value to compare against |
| `Connector` | String | Logical connector: `AND`, `OR`, or `NONE` |
| `Parameter` | String | Named parameter key |

## Supported Operators

| Operator | SQL | Description |
|----------|-----|-------------|
| `'='` | `=` | Equals (default) |
| `'!='` | `!=` | Not equals |
| `'>'` | `>` | Greater than |
| `'>='` | `>=` | Greater than or equal |
| `'<'` | `<` | Less than |
| `'<='` | `<=` | Less than or equal |
| `'LIKE'` | `LIKE` | Pattern match |
| `'IN'` | `IN (...)` | Value in set |
| `'NOT IN'` | `NOT IN (...)` | Value not in set |
| `'IS NULL'` | `IS NULL` | Null check |
| `'IS NOT NULL'` | `IS NOT NULL` | Not-null check |
| `'('` | `(` | Open group |
| `')'` | `)` | Close group |
