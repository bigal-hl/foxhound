# Delete Query

FoxHound supports two modes of deletion: **soft delete** (the default when a schema has a `Deleted` column) and **hard delete** (a true `DELETE FROM` statement).

## Soft Delete (Default)

When a schema with a `Deleted` column type is present, the delete operation generates an UPDATE that sets the deleted flag:

```javascript
tmpQuery
    .setScope('Books')
    .addFilter('IDBook', 42)
    .setIDUser(5)
    .setDialect('MySQL')
    .buildDeleteQuery();

// => UPDATE `Books` SET Deleted = 1, DeleteDate = NOW(3),
//    UpdateDate = NOW(3), DeleteIDUser = :DeleteIDUser_3
//    WHERE `Books`.`IDBook` = :IDBook_w0;
```

The soft delete automatically manages these schema columns:

| Schema Type | Behavior on Delete |
|------------|-------------------|
| `Deleted` | Set to `1` |
| `DeleteDate` | Set to current timestamp |
| `UpdateDate` | Set to current timestamp (delete is an update) |
| `DeleteIDUser` | Set to the value from `setIDUser()` |

## Hard Delete

When there is no `Deleted` column in the schema, or when delete tracking is disabled, FoxHound generates a true DELETE:

```javascript
tmpQuery
    .setScope('TempRecords')
    .addFilter('IDTemp', 99)
    .setDisableDeleteTracking(true)
    .setDialect('MySQL')
    .buildDeleteQuery();

// => DELETE FROM `TempRecords` WHERE `TempRecords`.`IDTemp` = :IDTemp_w0;
```

## Undelete

FoxHound also supports restoring soft-deleted records:

```javascript
tmpQuery
    .setScope('Books')
    .addFilter('IDBook', 42)
    .setIDUser(5)
    .setDialect('MySQL')
    .buildUndeleteQuery();

// => UPDATE `Books` SET Deleted = 0, UpdateDate = NOW(3),
//    UpdateIDUser = :UpdateIDUser_1
//    WHERE `Books`.`IDBook` = :IDBook_w0;
```

The undelete operation sets:

| Schema Type | Behavior on Undelete |
|------------|---------------------|
| `Deleted` | Set to `0` |
| `UpdateDate` | Set to current timestamp |
| `UpdateIDUser` | Set to the value from `setIDUser()` |

If the schema has no `Deleted` column, `buildUndeleteQuery()` produces a no-op (`SELECT NULL;`).

## Dialect Differences

The soft-delete and undelete operations use the same timestamp functions as other operations:

| Dialect | Timestamp Function |
|---------|-------------------|
| MySQL | `NOW(3)` |
| MSSQL | `GETUTCDATE()` |
| SQLite | `NOW()` (replaced by the provider with `datetime('now')`) |
| ALASQL | `NOW()` |
