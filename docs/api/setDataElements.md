# setDataElements

Set which columns to include in the SELECT clause.

## Signature

```javascript
tmpQuery.setDataElements(pDataElements)
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pDataElements` | Array or String | Yes | Column name(s) to select |

## Returns

Returns `this` for chaining.

## Description

Sets the list of columns to include in the SELECT field list.  When not set (or set to `false`), the query selects all columns using `*`.

If a string is passed, it is automatically wrapped in an array.

## Examples

### Select all columns (default)

```javascript
tmpQuery.setScope('Books').setDialect('MySQL').buildReadQuery();
// => SELECT `Books`.* FROM `Books`;
```

### Select specific columns

```javascript
tmpQuery
	.setScope('Books')
	.setDataElements(['Title', 'Author', 'PublishedYear'])
	.setDialect('MySQL')
	.buildReadQuery();

// => SELECT `Title`, `Author`, `PublishedYear` FROM `Books`;
```

### Single column as string

```javascript
tmpQuery.setDataElements('Title');
// Automatically converted to ['Title']
```

### Column aliases

Pass an array pair `[column, alias]` to create a column alias:

```javascript
tmpQuery
	.setScope('Books')
	.setDataElements([
		['Books.Title', 'BookTitle'],
		['Books.Author', 'AuthorName']
	])
	.setDialect('MySQL')
	.buildReadQuery();

// => SELECT `Books`.`Title` AS `BookTitle`, `Books`.`Author` AS `AuthorName`
//    FROM `Books`;
```

### Wildcard with specific columns

```javascript
tmpQuery
	.setScope('Books')
	.setDataElements(['*', 'Authors.Name'])
	.setDialect('PostgreSQL')
	.buildReadQuery();

// => SELECT *, "Authors"."Name" FROM "Books";
```

### Table-qualified wildcard

```javascript
tmpQuery
	.setScope('Books')
	.setDataElements(['Books.*', 'Authors.Name'])
	.setDialect('PostgreSQL')
	.buildReadQuery();

// => SELECT "Books".*, "Authors"."Name" FROM "Books";
```
