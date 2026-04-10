# Build Methods

Generate SQL from the current query configuration.

## Methods

| Method | Operation | SQL Pattern |
|--------|-----------|-------------|
| `buildCreateQuery()` | Insert a record | `INSERT INTO ... VALUES (...)` |
| `buildReadQuery()` | Select records | `SELECT ... FROM ... WHERE ...` |
| `buildUpdateQuery()` | Modify a record | `UPDATE ... SET ... WHERE ...` |
| `buildDeleteQuery()` | Soft- or hard-delete | `UPDATE ... SET Deleted=1` or `DELETE FROM ...` |
| `buildUndeleteQuery()` | Restore soft-deleted | `UPDATE ... SET Deleted=0` |
| `buildCountQuery()` | Count matching rows | `SELECT COUNT(*) AS RowCount FROM ...` |

All build methods return `this` for chaining.

## Accessing Results

After calling a build method, the generated SQL and bound parameters are available on the `query` property:

```javascript
tmpQuery.buildReadQuery();

console.log(tmpQuery.query.body);       // SQL string
console.log(tmpQuery.query.parameters); // Bound parameter values
```

## buildCreateQuery

Generate an INSERT statement.  Requires at least one record via `addRecord()`.

```javascript
var tmpQuery = libFoxHound.new(_Fable)
	.setDialect('PostgreSQL')
	.setScope('Books')
	.addRecord({Title: 'Dune', Author: 'Frank Herbert'})
	.buildCreateQuery();

console.log(tmpQuery.query.body);
// => INSERT INTO "Books" ( "Title", "Author")
//    VALUES ( :Title_0, :Author_1) RETURNING *;
```

Returns `false` for `query.body` if no records are provided or the record is empty.

## buildReadQuery

Generate a SELECT statement.  Uses all configured filters, sorts, joins, and pagination.

```javascript
var tmpQuery = libFoxHound.new(_Fable)
	.setDialect('MySQL')
	.setScope('Books')
	.setDataElements(['Title', 'Author'])
	.addFilter('Genre', 'Fantasy')
	.addSort('Title')
	.setCap(25)
	.buildReadQuery();

console.log(tmpQuery.query.body);
// => SELECT `Title`, `Author` FROM `Books`
//    WHERE `Books`.`Genre` = :Genre_w0
//    ORDER BY Title LIMIT 25;
```

## buildUpdateQuery

Generate an UPDATE ... SET statement.  Requires at least one record and typically a filter for the WHERE clause.

```javascript
var tmpQuery = libFoxHound.new(_Fable)
	.setDialect('MySQL')
	.setScope('Books')
	.addFilter('IDBook', 42)
	.addRecord({Title: 'Dune Messiah'})
	.buildUpdateQuery();

console.log(tmpQuery.query.body);
// => UPDATE `Books` SET Title = :Title_0 WHERE IDBook = :IDBook_w0;
```

Returns `false` for `query.body` if no records are provided.

## buildDeleteQuery

Generate a soft-delete UPDATE or a hard DELETE.

When a schema has a `Deleted` column type and delete tracking is enabled:

```javascript
// Soft delete -- generates an UPDATE
tmpQuery.buildDeleteQuery();
// => UPDATE `Books` SET Deleted = 1, DeleteDate = NOW(3), ...
```

When no schema or delete tracking is disabled:

```javascript
// Hard delete -- generates a DELETE
tmpQuery.setDisableDeleteTracking(true).buildDeleteQuery();
// => DELETE FROM `Books` WHERE IDBook = :IDBook_w0;
```

## buildUndeleteQuery

Restore soft-deleted records by setting `Deleted = 0`.

```javascript
var tmpQuery = libFoxHound.new(_Fable)
	.setDialect('MySQL')
	.setScope('Books')
	.addFilter('IDBook', 42)
	.setIDUser(5);

tmpQuery.query.schema = _BookSchema;
tmpQuery.buildUndeleteQuery();

// => UPDATE `Books` SET Deleted = 0, UpdateDate = NOW(3),
//    UpdateIDUser = :UpdateIDUser_1 WHERE IDBook = :IDBook_w0;
```

Returns `SELECT NULL;` if no Deleted column exists in the schema.

## buildCountQuery

Generate a SELECT COUNT(*) statement.

```javascript
var tmpQuery = libFoxHound.new(_Fable)
	.setDialect('MySQL')
	.setScope('Books')
	.addFilter('Genre', 'Fantasy')
	.buildCountQuery();

console.log(tmpQuery.query.body);
// => SELECT COUNT(*) AS RowCount FROM `Books`
//    WHERE `Books`.`Genre` = :Genre_w0;
```

With DISTINCT:

```javascript
tmpQuery.setDistinct(true).setDataElements(['Author']).buildCountQuery();
// => SELECT COUNT(DISTINCT `Author`) AS RowCount FROM `Books` ...;
```
