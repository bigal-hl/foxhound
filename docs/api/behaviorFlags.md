# Behavior Flags

Control how FoxHound handles automatic column management.

## Methods

All behavior flag methods accept a boolean and return `this` for chaining.

### setDisableAutoIdentity(pFlag)

Disable automatic identity column handling on INSERT.

```javascript
tmpQuery.setDisableAutoIdentity(true);
```

When **false** (default): AutoIdentity columns insert `NULL` (MySQL/SQLite), `DEFAULT` (PostgreSQL), or are omitted (MSSQL), letting the database assign the ID.

When **true**: The identity column value from the record is used as-is.

```javascript
// Force a specific ID value
tmpQuery
	.setDisableAutoIdentity(true)
	.addRecord({IDBook: 999, Title: 'Custom ID Book'});

tmpQuery.query.schema = [{Column: 'IDBook', Type: 'AutoIdentity'}, ...];
tmpQuery.setDialect('MySQL').buildCreateQuery();

// IDBook uses the provided value 999 instead of NULL
```

### setDisableAutoDateStamp(pFlag)

Disable automatic timestamp generation.

```javascript
tmpQuery.setDisableAutoDateStamp(true);
```

When **false** (default): `CreateDate`, `UpdateDate`, and `DeleteDate` columns are automatically set to the current timestamp.

When **true**: These columns use the value from the record object instead.

```javascript
// Set a custom date
tmpQuery
	.setDisableAutoDateStamp(true)
	.addRecord({Title: 'Imported Book', CreateDate: '2020-01-15'});

// CreateDate uses '2020-01-15' instead of NOW()
```

### setDisableAutoUserStamp(pFlag)

Disable automatic user ID stamping.

```javascript
tmpQuery.setDisableAutoUserStamp(true);
```

When **false** (default): `CreateIDUser`, `UpdateIDUser`, and `DeleteIDUser` columns are set to the value from `setIDUser()`.

When **true**: These columns use the value from the record object instead.

### setDisableDeleteTracking(pFlag)

Disable soft-delete behavior.

```javascript
tmpQuery.setDisableDeleteTracking(true);
```

When **false** (default):
- `DELETE` generates an UPDATE that sets `Deleted = 1`
- `DeleteDate` and `DeleteIDUser` columns are excluded from INSERT
- Read and Count queries automatically add `WHERE Deleted = 0`

When **true**:
- `DELETE` generates a true `DELETE FROM` statement
- `DeleteDate` and `DeleteIDUser` columns are included in INSERT
- No automatic `Deleted` filter on Read/Count queries

```javascript
// Hard delete instead of soft delete
tmpQuery
	.setScope('TempRecords')
	.addFilter('IDTemp', 99)
	.setDisableDeleteTracking(true)
	.setDialect('MySQL')
	.buildDeleteQuery();

// => DELETE FROM `TempRecords` WHERE IDTemp = :IDTemp_w0;
```

### setLogLevel(pLogLevel)

Set query logging verbosity.

```javascript
tmpQuery.setLogLevel(3);
```

| Level | Behavior |
|-------|----------|
| `0` | No logging (default) |
| `1` | Log generated queries |
| `2` | Log queries and non-parameterized versions |
| `3+` | Log everything including configuration steps |

## Combining Flags

Flags can be combined as needed:

```javascript
tmpQuery
	.setDisableAutoIdentity(true)
	.setDisableAutoDateStamp(true)
	.setDisableAutoUserStamp(true)
	.setDisableDeleteTracking(true);
```

This gives you full manual control over all column values -- useful for data migration or import scenarios.
