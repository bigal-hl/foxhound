# Joins

FoxHound supports table joins for Read and Count queries, allowing you to query across related tables.

## Adding a Join

Use `addJoin()` to add a join to your query:

```javascript
tmpQuery.addJoin('Authors', 'Authors.IDAuthor', 'Books.IDAuthor');
```

The full signature is:

```javascript
addJoin(pTable, pFrom, pTo, pType)
```

| Argument | Default | Description |
|----------|---------|-------------|
| `pTable` | *(required)* | The table to join |
| `pFrom` | *(required)* | Column on the join table (must start with `pTable`) |
| `pTo` | *(required)* | Column on another table (must include a `.`) |
| `pType` | `'INNER JOIN'` | Join type |

## Join Types

You can specify any SQL join type:

```javascript
// Inner join (default)
tmpQuery.addJoin('Authors', 'Authors.IDAuthor', 'Books.IDAuthor');

// Left join
tmpQuery.addJoin('Authors', 'Authors.IDAuthor', 'Books.IDAuthor', 'LEFT JOIN');

// Right join
tmpQuery.addJoin('Reviews', 'Reviews.IDBook', 'Books.IDBook', 'RIGHT JOIN');
```

## Multiple Joins

Chain multiple `addJoin()` calls:

```javascript
tmpQuery
    .setScope('Books')
    .addJoin('Authors', 'Authors.IDAuthor', 'Books.IDAuthor')
    .addJoin('Publishers', 'Publishers.IDPublisher', 'Books.IDPublisher', 'LEFT JOIN')
    .setDialect('MySQL')
    .buildReadQuery();

// => SELECT `Books`.* FROM `Books`
//    INNER JOIN Authors ON Authors.IDAuthor = Books.IDAuthor
//    LEFT JOIN Publishers ON Publishers.IDPublisher = Books.IDPublisher;
```

## Setting Joins Directly

Use `setJoin()` to replace the entire join array:

```javascript
tmpQuery.setJoin([
    {Type: 'INNER JOIN', Table: 'Authors', From: 'Authors.IDAuthor', To: 'Books.IDAuthor'},
    {Type: 'LEFT JOIN', Table: 'Publishers', From: 'Publishers.IDPublisher', To: 'Books.IDPublisher'}
]);
```

Or a single join object:

```javascript
tmpQuery.setJoin({Type: 'INNER JOIN', Table: 'Authors', From: 'Authors.IDAuthor', To: 'Books.IDAuthor'});
```

## Join Object Structure

| Property | Type | Description |
|----------|------|-------------|
| `Type` | String | Join type (e.g. `'INNER JOIN'`, `'LEFT JOIN'`) |
| `Table` | String | Table to join |
| `From` | String | Column on the join table |
| `To` | String | Column on the base or another table |

## Validation

FoxHound performs basic validation on join parameters:

- `pTable` must be a string
- `pFrom` and `pTo` must be defined
- `pFrom` must start with the join table name
- `pTo` must include a dot (table-qualified field name)

Invalid joins are logged as warnings and silently skipped.

## Dialect Differences

- **MySQL** -- `INNER JOIN Authors ON Authors.IDAuthor = Books.IDAuthor`
- **MSSQL** -- `INNER JOIN [Authors] ON Authors.IDAuthor = Books.IDAuthor`
- **SQLite/ALASQL** -- joins are supported in Read queries but not generated (the SQLite and ALASQL dialects do not include a `generateJoins` function; joins work through query overrides)

> **Note:** The SQLite and ALASQL dialects are primarily designed for simpler single-table queries.  For complex join scenarios, consider using a query override or the MySQL/MSSQL dialect.
