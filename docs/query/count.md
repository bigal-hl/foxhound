# Count Query

The Count operation generates a `SELECT COUNT(*)` statement to efficiently count matching rows without returning the full result set.

## Basic Usage

```javascript
tmpQuery
    .setScope('Books')
    .setDialect('MySQL')
    .buildCountQuery();

console.log(tmpQuery.query.body);
// => SELECT COUNT(*) AS RowCount FROM `Books`;
```

## With Filters

```javascript
tmpQuery
    .setScope('Books')
    .addFilter('Genre', 'Science Fiction')
    .setDialect('MySQL')
    .buildCountQuery();

// => SELECT COUNT(*) AS RowCount FROM `Books`
//    WHERE `Books`.`Genre` = :Genre_w0;
```

## DISTINCT Count

When `setDistinct(true)` is used, the count query counts only unique combinations of the selected fields:

```javascript
tmpQuery
    .setScope('Books')
    .setDataElements(['Author'])
    .setDistinct(true)
    .setDialect('MySQL')
    .buildCountQuery();

// => SELECT COUNT(DISTINCT `Author`) AS RowCount FROM `Books`;
```

If no fields or schema are available when distinct is requested, FoxHound falls back to a standard `COUNT(*)`.

## With Joins

Count queries support joins, so you can count records across related tables:

```javascript
tmpQuery
    .setScope('Books')
    .addJoin('Authors', 'Authors.IDAuthor', 'Books.IDAuthor')
    .addFilter('Authors.Country', 'USA')
    .setDialect('MySQL')
    .buildCountQuery();

// => SELECT COUNT(*) AS RowCount FROM `Books`
//    INNER JOIN Authors ON Authors.IDAuthor = Books.IDAuthor
//    WHERE Authors.Country = :Country_w0;
```

## Soft-Delete Awareness

Just like Read queries, Count queries automatically exclude soft-deleted records when a schema with a `Deleted` column is present.

## Query Overrides

Count queries support query overrides with the same template variables as Read queries.  The `OrderBy` and `Limit` variables are always empty strings for count operations.

## Dialect Differences

| Dialect | Count Alias |
|---------|-------------|
| MySQL | `RowCount` |
| MSSQL | `Row_Count` |
| SQLite | `RowCount` |
| ALASQL | `RowCount` |

The alias differs for MSSQL because `RowCount` is a reserved keyword in some SQL Server configurations.
