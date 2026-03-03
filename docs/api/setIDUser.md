# setIDUser

Set the user ID for automatic audit column stamping.

## Signature

```javascript
tmpQuery.setIDUser(pIDUser)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pIDUser` | Integer | Yes | User ID (must be >= 0) |

## Returns

Returns `this` for chaining.

## Description

Sets the user ID that FoxHound uses when auto-populating audit columns in schema-aware queries.  This value is applied to:

- `CreateIDUser` columns on INSERT
- `UpdateIDUser` columns on INSERT and UPDATE
- `DeleteIDUser` columns on soft DELETE

The value defaults to `0` if not set.

## Examples

### Basic usage

```javascript
tmpQuery
	.setScope('Books')
	.addRecord({Title: 'Dune', Author: 'Frank Herbert'})
	.setIDUser(42);

tmpQuery.query.schema = [
	{Column: 'IDBook', Type: 'AutoIdentity'},
	{Column: 'Title', Type: 'String'},
	{Column: 'Author', Type: 'String'},
	{Column: 'CreatingIDUser', Type: 'CreateIDUser'},
	{Column: 'UpdatingIDUser', Type: 'UpdateIDUser'}
];

tmpQuery.setDialect('MySQL').buildCreateQuery();

// CreatingIDUser => 42
// UpdatingIDUser => 42
```

### With soft delete

```javascript
tmpQuery
	.setScope('Books')
	.addFilter('IDBook', 99)
	.setIDUser(5);

tmpQuery.query.schema = [
	{Column: 'IDBook', Type: 'AutoIdentity'},
	{Column: 'Deleted', Type: 'Deleted'},
	{Column: 'DeleteDate', Type: 'DeleteDate'},
	{Column: 'DeletingIDUser', Type: 'DeleteIDUser'},
	{Column: 'UpdateDate', Type: 'UpdateDate'}
];

tmpQuery.setDialect('MySQL').buildDeleteQuery();

// DeletingIDUser => 5
```

### Alternative: direct property access

```javascript
tmpQuery.query.IDUser = 42;
```
