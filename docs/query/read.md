# Read Query

The Read operation generates a `SELECT` statement with support for field selection, filtering, sorting, joins, pagination, and query overrides.

## Basic Usage

```javascript
tmpQuery
    .setScope('Books')
    .setDialect('MySQL')
    .buildReadQuery();

console.log(tmpQuery.query.body);
// => SELECT `Books`.* FROM `Books`;
```

## Selecting Specific Columns

```javascript
tmpQuery
    .setScope('Books')
    .setDataElements(['Title', 'Author', 'PublishedYear'])
    .setDialect('MySQL')
    .buildReadQuery();

// => SELECT `Title`, `Author`, `PublishedYear` FROM `Books`;
```

You can also use column aliases with array pairs:

```javascript
tmpQuery.setDataElements([
    ['Books.Title', 'BookTitle'],
    ['Books.Author', 'AuthorName']
]);

// => SELECT `Books`.`Title` AS `BookTitle`, `Books`.`Author` AS `AuthorName` FROM `Books`;
```

## DISTINCT Results

```javascript
tmpQuery
    .setScope('Books')
    .setDataElements(['Genre'])
    .setDistinct(true)
    .setDialect('MySQL')
    .buildReadQuery();

// => SELECT DISTINCT `Genre` FROM `Books`;
```

## With Filters

```javascript
tmpQuery
    .setScope('Books')
    .addFilter('Genre', 'Science Fiction')
    .addFilter('PublishedYear', 2000, '>')
    .setDialect('MySQL')
    .buildReadQuery();

// => SELECT `Books`.* FROM `Books`
//    WHERE `Books`.`Genre` = :Genre_w0
//    AND `Books`.`PublishedYear` > :PublishedYear_w1;
```

See the [Filters](filters.md) page for full filter documentation.

## With Sorting

```javascript
tmpQuery
    .setScope('Books')
    .addSort({Column: 'PublishedYear', Direction: 'Descending'})
    .setDialect('MySQL')
    .buildReadQuery();

// => SELECT `Books`.* FROM `Books` ORDER BY PublishedYear DESC;
```

See the [Sorting](sorting.md) page for full sort documentation.

## With Joins

```javascript
tmpQuery
    .setScope('Books')
    .addJoin('Authors', 'Authors.IDAuthor', 'Books.IDAuthor')
    .setDialect('MySQL')
    .buildReadQuery();

// => SELECT `Books`.* FROM `Books`
//    INNER JOIN Authors ON Authors.IDAuthor = Books.IDAuthor;
```

See the [Joins](joins.md) page for full join documentation.

## With Pagination

```javascript
tmpQuery
    .setScope('Books')
    .setBegin(20)
    .setCap(10)
    .setDialect('MySQL')
    .buildReadQuery();

// => SELECT `Books`.* FROM `Books` LIMIT 20, 10;
```

See the [Pagination](pagination.md) page for dialect-specific pagination details.

## With Index Hints

MySQL and MSSQL support index hints:

```javascript
tmpQuery.indexHints = ['idx_genre', 'idx_year'];

// MySQL:  SELECT ... FROM `Books` USE INDEX (idx_genre,idx_year) ...
// MSSQL:  SELECT ... FROM [Books] WITH(INDEX(idx_genre,idx_year)) ...
```

## Query Overrides

You can supply a custom query template while still benefiting from automatic parameter binding:

```javascript
tmpQuery.parameters.queryOverride =
    'SELECT <%= FieldList %> FROM <%= TableName %> <%= Where %> <%= OrderBy %> <%= Limit %>';
```

See [Query Overrides](query-overrides.md) for details on available template variables.

## Soft-Delete Awareness

When a schema with a `Deleted` column is present and delete tracking is enabled (the default), Read queries automatically add a `WHERE Deleted = 0` filter so that soft-deleted records are excluded.
