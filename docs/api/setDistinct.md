# setDistinct

Enable or disable DISTINCT result filtering.

## Signature

```javascript
tmpQuery.setDistinct(pDistinct)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pDistinct` | Boolean | Yes | `true` to enable DISTINCT |

## Returns

Returns `this` for chaining.

## Description

When enabled, the generated SELECT statement includes the `DISTINCT` keyword to return only unique rows.

For Count queries with DISTINCT, FoxHound counts distinct values of the selected field list (or the AutoIdentity column from the schema if no specific fields are set).

## Examples

### DISTINCT select

```javascript
tmpQuery
	.setScope('Books')
	.setDataElements(['Genre'])
	.setDistinct(true)
	.setDialect('MySQL')
	.buildReadQuery();

// => SELECT DISTINCT `Genre` FROM `Books`;
```

### DISTINCT count

```javascript
tmpQuery
	.setScope('Books')
	.setDataElements(['Author'])
	.setDistinct(true)
	.setDialect('MySQL')
	.buildCountQuery();

// => SELECT COUNT(DISTINCT `Author`) AS RowCount FROM `Books`;
```

### DISTINCT count with schema (no explicit fields)

```javascript
tmpQuery
	.setScope('Books')
	.setDistinct(true);

tmpQuery.query.schema = [
	{Column: 'IDBook', Type: 'AutoIdentity'},
	{Column: 'Title', Type: 'String'}
];

tmpQuery.setDialect('MySQL').buildCountQuery();

// => SELECT COUNT(DISTINCT `Books`.`IDBook`) AS RowCount FROM `Books`;
```

### Disable DISTINCT

```javascript
tmpQuery.setDistinct(false);
```
