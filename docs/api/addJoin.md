# addJoin / setJoin

Add or replace JOIN expressions for multi-table queries.

## addJoin

Add a single join expression.

### Signature

```javascript
tmpQuery.addJoin(pTable, pFrom, pTo, pType)
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pTable` | String | *(required)* | Table to join |
| `pFrom` | String | *(required)* | Column on the join table (must start with `pTable`) |
| `pTo` | String | *(required)* | Column on the base table (must include a `.`) |
| `pType` | String | `'INNER JOIN'` | Join type |

### Returns

Returns `this` for chaining.

### Examples

#### Inner join (default)

```javascript
tmpQuery
	.setScope('Books')
	.addJoin('Authors', 'Authors.IDAuthor', 'Books.IDAuthor')
	.setDialect('MySQL')
	.buildReadQuery();

// => SELECT `Books`.* FROM `Books`
//    INNER JOIN Authors ON Authors.IDAuthor = Books.IDAuthor;
```

#### Left join

```javascript
tmpQuery.addJoin('Authors', 'Authors.IDAuthor', 'Books.IDAuthor', 'LEFT JOIN');

// => ... LEFT JOIN Authors ON Authors.IDAuthor = Books.IDAuthor ...
```

#### Right join

```javascript
tmpQuery.addJoin('Reviews', 'Reviews.IDBook', 'Books.IDBook', 'RIGHT JOIN');

// => ... RIGHT JOIN Reviews ON Reviews.IDBook = Books.IDBook ...
```

#### Multiple joins

```javascript
tmpQuery
	.setScope('Books')
	.addJoin('Authors', 'Authors.IDAuthor', 'Books.IDAuthor')
	.addJoin('Publishers', 'Publishers.IDPublisher', 'Books.IDPublisher', 'LEFT JOIN')
	.setDialect('MySQL')
	.buildReadQuery();

// => SELECT `Books`.* FROM `Books`
//    INNER JOIN Authors ON Authors.IDAuthor = Books.IDAuthor
//    LEFT JOIN Publishers ON Publishers.IDPublisher = Books.IDPublisher;
```

## setJoin

Replace the entire join array.

### Signature

```javascript
tmpQuery.setJoin(pJoin)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pJoin` | Object or Array | Join expression(s) |

### Examples

#### Single join object

```javascript
tmpQuery.setJoin({
	Type: 'INNER JOIN',
	Table: 'Authors',
	From: 'Authors.IDAuthor',
	To: 'Books.IDAuthor'
});
```

#### Array of joins

```javascript
tmpQuery.setJoin([
	{Type: 'INNER JOIN', Table: 'Authors', From: 'Authors.IDAuthor', To: 'Books.IDAuthor'},
	{Type: 'LEFT JOIN', Table: 'Publishers', From: 'Publishers.IDPublisher', To: 'Books.IDPublisher'}
]);
```

## Join Object Structure

| Property | Type | Description |
|----------|------|-------------|
| `Type` | String | Join type (e.g. `'INNER JOIN'`, `'LEFT JOIN'`, `'RIGHT JOIN'`) |
| `Table` | String | Table to join |
| `From` | String | Column on the join table |
| `To` | String | Column on the base or another table |

## Validation

FoxHound validates join parameters:

- `pTable` must be a string
- `pFrom` must start with the join table name
- `pTo` must include a dot (table-qualified column name)
- Invalid joins are logged as warnings and silently skipped
