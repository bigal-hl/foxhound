# Create Query

The Create operation generates an `INSERT INTO` statement from a record object.

## Basic Usage

```javascript
tmpQuery
    .setScope('Books')
    .addRecord({Title: 'Dune', Author: 'Frank Herbert', PublishedYear: 1965})
    .setDialect('MySQL')
    .buildCreateQuery();

console.log(tmpQuery.query.body);
// => INSERT INTO `Books` ( Title, Author, PublishedYear)
//    VALUES ( :Title_0, :Author_1, :PublishedYear_2);

console.log(tmpQuery.query.parameters);
// => { Title_0: 'Dune', Author_1: 'Frank Herbert', PublishedYear_2: 1965 }
```

## Schema-Aware Behavior

When a schema is attached to the query, FoxHound automatically handles special column types during INSERT:

| Schema Type | Behavior |
|------------|----------|
| `AutoIdentity` | Inserts `NULL` (lets the database assign the ID) |
| `AutoGUID` | Generates a UUID via Fable, unless the record already has a valid GUID |
| `CreateDate` | Inserts the current timestamp (`NOW(3)` for MySQL, `GETUTCDATE()` for MSSQL) |
| `CreateIDUser` | Inserts the user ID from `setIDUser()` |
| `UpdateDate` | Inserts the current timestamp |
| `UpdateIDUser` | Inserts the user ID |
| `DeleteDate` | Skipped on insert (when delete tracking is enabled) |
| `DeleteIDUser` | Skipped on insert (when delete tracking is enabled) |
| `Deleted` | Included normally (typically defaults to `0`) |

## Setting the User

To stamp which user created the record:

```javascript
tmpQuery.setIDUser(42);
```

This value is used for any `CreateIDUser`, `UpdateIDUser`, or `DeleteIDUser` schema columns.

## Disabling Auto-Management

You can disable automatic column management when you need full control:

```javascript
tmpQuery.setDisableAutoIdentity(true);   // Include identity column value as-is
tmpQuery.setDisableAutoDateStamp(true);   // Don't auto-generate timestamps
tmpQuery.setDisableAutoUserStamp(true);   // Don't auto-stamp user IDs
tmpQuery.setDisableDeleteTracking(true);  // Include delete columns on insert
```

## Dialect Differences

The INSERT syntax is largely the same across dialects, with a few differences:

- **MySQL** — uses backtick-quoted identifiers and `:name` parameters
- **MSSQL** — uses bracket-quoted identifiers, `@name` parameters, and skips the AutoIdentity column entirely (rather than inserting NULL)
- **SQLite** — uses backtick-quoted identifiers and `:name` parameters
- **ALASQL** — same as SQLite
