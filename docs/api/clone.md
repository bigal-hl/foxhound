# clone / resetParameters / mergeParameters

Utility methods for managing query state.

## clone

Create an independent copy of the current query.

### Signature

```javascript
var tmpClone = tmpQuery.clone();
```

### Returns

Returns a new FoxHound query instance with copies of the current scope, begin, cap, schema, dataElements, sorts, and filters.

### Description

Cloning is useful when you need to build multiple similar queries from the same base configuration.  The cloned query has its own independent state — changes to the clone do not affect the original.

### Example

```javascript
var tmpBase = libFoxHound.new(_Fable)
	.setDialect('MySQL')
	.setScope('Books')
	.addFilter('Genre', 'Fantasy');

// Clone and customize for a read
var tmpRead = tmpBase.clone();
tmpRead.setCap(10).buildReadQuery();

// Clone and customize for a count
var tmpCount = tmpBase.clone();
tmpCount.buildCountQuery();

console.log(tmpRead.query.body);
// => SELECT `Books`.* FROM `Books` WHERE ... LIMIT 10;

console.log(tmpCount.query.body);
// => SELECT COUNT(*) AS RowCount FROM `Books` WHERE ...;
```

## resetParameters

Reset the query to its default state.

### Signature

```javascript
tmpQuery.resetParameters()
```

### Returns

Returns `this` for chaining.

### Description

Re-initializes all parameters (scope, filters, sorts, joins, cap, begin, records, etc.) to their default values.  This is useful for reusing a query object for a new query.

### Example

```javascript
tmpQuery
	.setScope('Books')
	.addFilter('Genre', 'Fantasy')
	.buildReadQuery();

// Reset and build a new query
tmpQuery.resetParameters();
tmpQuery
	.setScope('Authors')
	.setDialect('MySQL')
	.buildReadQuery();

console.log(tmpQuery.query.body);
// => SELECT `Authors`.* FROM `Authors`;
```

## mergeParameters

Merge an object of parameters into the current state.

### Signature

```javascript
tmpQuery.mergeParameters(pFromParameters)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pFromParameters` | Object | Object with parameter values to merge |

### Returns

Returns `this` for chaining.

### Description

Performs a shallow merge of the provided object into the current parameters.  This is useful for applying a set of parameter overrides at once.

### Example

```javascript
tmpQuery.mergeParameters({
	cap: 50,
	begin: 0,
	scope: 'Books'
});
```
