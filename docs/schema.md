# Schema Integration

FoxHound is schema-aware — when a schema array is attached to a query, it uses the column type annotations to automatically manage identity columns, timestamps, user stamps, and soft-delete tracking.

## Attaching a Schema

The schema is set on the `query.schema` property, typically by Meadow before query generation:

```javascript
tmpQuery.query.schema = [
    {Column: 'IDBook', Type: 'AutoIdentity'},
    {Column: 'GUIDBook', Type: 'AutoGUID'},
    {Column: 'Title', Type: 'String'},
    {Column: 'Author', Type: 'String'},
    {Column: 'PublishedYear', Type: 'Integer'},
    {Column: 'CreateDate', Type: 'CreateDate'},
    {Column: 'CreatingIDUser', Type: 'CreateIDUser'},
    {Column: 'UpdateDate', Type: 'UpdateDate'},
    {Column: 'UpdatingIDUser', Type: 'UpdateIDUser'},
    {Column: 'Deleted', Type: 'Deleted'},
    {Column: 'DeleteDate', Type: 'DeleteDate'},
    {Column: 'DeletingIDUser', Type: 'DeleteIDUser'}
];
```

## Schema Column Types

| Type | Purpose | Create | Read | Update | Delete | Undelete |
|------|---------|--------|------|--------|--------|----------|
| `AutoIdentity` | Auto-increment primary key | `NULL` (DB assigns) | included | **skipped** | — | — |
| `AutoGUID` | Auto-generated UUID | UUID or user value | included | included | — | — |
| `CreateDate` | Row creation timestamp | `NOW()` | included | **skipped** | — | — |
| `CreateIDUser` | Row creator user ID | `IDUser` | included | **skipped** | — | — |
| `UpdateDate` | Last modification timestamp | `NOW()` | included | `NOW()` | `NOW()` | `NOW()` |
| `UpdateIDUser` | Last modifier user ID | `IDUser` | included | `IDUser` | — | `IDUser` |
| `Deleted` | Soft-delete flag | `0` | auto-filtered | — | set to `1` | set to `0` |
| `DeleteDate` | Deletion timestamp | **skipped** | included | **skipped** | `NOW()` | — |
| `DeleteIDUser` | Deleter user ID | **skipped** | included | **skipped** | `IDUser` | — |
| `String` | Text data | parameterized | included | parameterized | — | — |
| `Integer` | Numeric data | parameterized | included | parameterized | — | — |
| `Decimal` | Decimal data | parameterized | included | parameterized | — | — |
| `Boolean` | Boolean data | parameterized | included | parameterized | — | — |
| `DateTime` | Date/time data | parameterized | included | parameterized | — | — |

## How Schema Affects Each Operation

### Create (INSERT)

- `AutoIdentity` → inserts `NULL` (MySQL/SQLite) or is omitted (MSSQL)
- `AutoGUID` → generates a UUID via Fable, unless the record has a valid GUID already
- `CreateDate`, `UpdateDate` → inserts the current timestamp
- `CreateIDUser`, `UpdateIDUser` → inserts the user ID from `setIDUser()`
- `DeleteDate`, `DeleteIDUser` → **skipped** (when delete tracking is enabled)

### Update

- `AutoIdentity`, `CreateDate`, `CreateIDUser`, `DeleteDate`, `DeleteIDUser` → **skipped**
- `UpdateDate` → set to current timestamp automatically
- `UpdateIDUser` → set to the value from `setIDUser()`
- All other columns → parameterized from the record

### Delete (Soft)

Only these columns are modified:
- `Deleted` → set to `1`
- `DeleteDate` → set to current timestamp
- `UpdateDate` → set to current timestamp
- `DeleteIDUser` → set to the value from `setIDUser()`

### Undelete

Only these columns are modified:
- `Deleted` → set to `0`
- `UpdateDate` → set to current timestamp
- `UpdateIDUser` → set to the value from `setIDUser()`

### Read / Count

- Automatically adds `WHERE Deleted = 0` filter when a `Deleted` column type is in the schema
- Uses the `AutoIdentity` column for `DISTINCT COUNT` operations when no specific fields are set

## Disabling Auto-Management

| Flag | Effect |
|------|--------|
| `setDisableAutoIdentity(true)` | Include identity values as-is (don't insert NULL) |
| `setDisableAutoDateStamp(true)` | Don't auto-generate timestamps |
| `setDisableAutoUserStamp(true)` | Don't auto-stamp user IDs |
| `setDisableDeleteTracking(true)` | Include delete columns on insert; skip soft-delete filter on reads |

## Stricture Integration

Schemas are typically defined using [Stricture](https://github.com/stevenvelozo/stricture), a companion tool that generates schema definitions from a DDL-like JSON format.  Stricture produces the exact schema array format that FoxHound expects.
