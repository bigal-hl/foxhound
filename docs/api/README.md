# API Reference

Complete reference for every public method and property in FoxHound.

## Creating a Query

```javascript
var libFable = require('fable');
var libFoxHound = require('foxhound');

var _Fable = new libFable({});
var tmpQuery = libFoxHound.new(_Fable);
```

## Method Categories

### Configuration

These methods configure the query and return `this` for chaining.

| Method | Purpose |
|--------|---------|
| [setScope(pScope)](setScope.md) | Set the target table or collection |
| [setDialect(pDialectName)](setDialect.md) | Set the SQL dialect for output |
| [setDataElements(pDataElements)](setDataElements.md) | Set which columns to select |
| [setDistinct(pDistinct)](setDistinct.md) | Enable DISTINCT results |
| [addFilter / setFilter](addFilter.md) | Add or set WHERE clause conditions |
| [addSort / setSort](addSort.md) | Add or set ORDER BY expressions |
| [addJoin / setJoin](addJoin.md) | Add or set JOIN expressions |
| [setCap / setBegin](setCap.md) | Set pagination (LIMIT / OFFSET) |
| [addRecord(pRecord)](addRecord.md) | Add a record for INSERT or UPDATE |
| [setIDUser(pIDUser)](setIDUser.md) | Set the user ID for audit columns |
| [Behavior Flags](behaviorFlags.md) | Disable auto-identity, timestamps, user stamps, delete tracking |

### Query Building

| Method | Purpose |
|--------|---------|
| [Build Methods](buildQuery.md) | buildCreateQuery, buildReadQuery, buildUpdateQuery, buildDeleteQuery, buildUndeleteQuery, buildCountQuery |

### Utility

| Method | Purpose |
|--------|---------|
| [clone / resetParameters / mergeParameters](clone.md) | Copy, reset, or merge query state |
| [Query Overrides](queryOverrides.md) | Custom SQL templates for Read and Count |

## Properties

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `query` | Object | get/set | The generated query (`body`, `schema`, `records`, `parameters`) |
| `result` | Object | get/set | Execution results (`executed`, `value`, `error`) |
| `parameters` | Object | get/set | Full parameters state |
| `dialect` | Object | get | Current dialect object |
| `uuid` | String | get | Unique identifier for this query |
| `logLevel` | Integer | get | Current log level |
| `indexHints` | Array | get/set | Index hints for the database engine |

## Chaining

All configuration methods return `this`, enabling fluent composition:

```javascript
tmpQuery
	.setScope('Books')
	.setDataElements(['Title', 'Author'])
	.addFilter('Genre', 'Fantasy')
	.addSort('Title')
	.setCap(25)
	.setDialect('PostgreSQL')
	.buildReadQuery();
```
