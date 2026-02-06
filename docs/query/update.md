# Update Query

The Update operation generates an `UPDATE ... SET ... WHERE ...` statement from a record object and filter criteria.

## Basic Usage

```javascript
tmpQuery
    .setScope('Books')
    .addFilter('IDBook', 42)
    .addRecord({Title: 'Dune Messiah', PublishedYear: 1969})
    .setIDUser(5)
    .setDialect('MySQL')
    .buildUpdateQuery();

console.log(tmpQuery.query.body);
// => UPDATE `Books` SET Title = :Title_0, PublishedYear = :PublishedYear_1
//    WHERE `Books`.`IDBook` = :IDBook_w0;

console.log(tmpQuery.query.parameters);
// => { Title_0: 'Dune Messiah', PublishedYear_1: 1969, IDBook_w0: 42 }
```

## Schema-Aware Behavior

When a schema is present, FoxHound manages certain columns automatically:

| Schema Type | Behavior on Update |
|------------|-------------------|
| `AutoIdentity` | **Skipped** — never updated |
| `CreateDate` | **Skipped** — set only on insert |
| `CreateIDUser` | **Skipped** — set only on insert |
| `UpdateDate` | Set to current timestamp automatically |
| `UpdateIDUser` | Set to the value from `setIDUser()` |
| `DeleteDate` | **Skipped** — managed by delete operations |
| `DeleteIDUser` | **Skipped** — managed by delete operations |

## Disabling Auto-Management

```javascript
tmpQuery.setDisableAutoDateStamp(true);   // Don't auto-set UpdateDate
tmpQuery.setDisableAutoUserStamp(true);   // Don't auto-set UpdateIDUser
```

## Important Notes

- The record passed to `addRecord()` should contain only the columns you want to change — FoxHound generates SET clauses for each key in the record object
- Always include a filter (usually on the primary key) to avoid updating all rows
- If the record object is empty or no records have been added, `buildUpdateQuery()` returns `false` for the query body

## Dialect Differences

- **MySQL** — backtick-quoted identifiers, `:name` parameters
- **MSSQL** — bracket-quoted identifiers, `@name` parameters; special handling for `UpdateDate` with `disableAutoDateStamp`
- **SQLite** — backtick-quoted identifiers, `:name` parameters
- **ALASQL** — same as SQLite
