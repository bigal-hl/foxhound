# addRecord

Add a record for CREATE or UPDATE operations.

## Signature

```javascript
tmpQuery.addRecord(pRecord)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pRecord` | Object | Yes | Key-value pairs of column names and values |

## Returns

Returns `this` for chaining.

## Description

Adds a record object to the query's record list.  The keys become column names and the values become parameterized values in the generated SQL.

For CREATE operations, the record defines the column-value pairs for the INSERT statement.  For UPDATE operations, the record defines the SET clause (which columns to change and their new values).

Only the first record in the list is used for query generation in the current implementation.

Non-object values are silently ignored.

## Examples

### Insert a new record

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

### Update a record

```javascript
tmpQuery
	.setScope('Books')
	.addFilter('IDBook', 42)
	.addRecord({Title: 'Dune Messiah', PublishedYear: 1969})
	.setDialect('MySQL')
	.buildUpdateQuery();

console.log(tmpQuery.query.body);
// => UPDATE `Books` SET Title = :Title_0, PublishedYear = :PublishedYear_1
//    WHERE IDBook = :IDBook_w0;
```

### With schema for automatic column management

```javascript
tmpQuery
	.setScope('Books')
	.addRecord({
		IDBook: null,
		Title: 'Neuromancer',
		Author: 'William Gibson',
		CreateDate: null,
		CreatingIDUser: null,
		UpdateDate: null,
		UpdatingIDUser: null,
		Deleted: 0
	});

tmpQuery.query.schema = [
	{Column: 'IDBook', Type: 'AutoIdentity'},
	{Column: 'Title', Type: 'String'},
	{Column: 'Author', Type: 'String'},
	{Column: 'CreateDate', Type: 'CreateDate'},
	{Column: 'CreatingIDUser', Type: 'CreateIDUser'},
	{Column: 'UpdateDate', Type: 'UpdateDate'},
	{Column: 'UpdatingIDUser', Type: 'UpdateIDUser'},
	{Column: 'Deleted', Type: 'Deleted'}
];

tmpQuery.query.IDUser = 5;
tmpQuery.setDialect('MySQL').buildCreateQuery();

// IDBook    => NULL (AutoIdentity)
// CreateDate => NOW(3) (auto timestamp)
// CreatingIDUser => 5 (auto user stamp)
```

### Empty record

```javascript
// No-op: buildCreateQuery() and buildUpdateQuery() return false
tmpQuery.addRecord({});
tmpQuery.buildCreateQuery();
console.log(tmpQuery.query.body);
// => false
```
