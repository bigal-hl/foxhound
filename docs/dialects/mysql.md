# MySQL Dialect

The MySQL dialect generates SQL compatible with MySQL and MariaDB.

## Identifier Quoting

MySQL uses backtick quoting for identifiers:

```sql
SELECT `Books`.* FROM `Books` WHERE `Books`.`Genre` = :Genre_w0;
```

FoxHound properly handles table-qualified field names, quoting each segment separately:

```sql
`Books`.`Title`
```

## Named Parameters

The MySQL dialect uses `:name` syntax for named parameters:

```sql
INSERT INTO `Books` ( Title, Author) VALUES ( :Title_0, :Author_1);
```

The bound values are stored in `query.parameters` as a plain object:

```javascript
{ Title_0: 'Dune', Author_1: 'Frank Herbert' }
```

## Timestamp Function

MySQL uses `NOW(3)` to capture the current timestamp with millisecond precision.  This is used for `CreateDate`, `UpdateDate`, `DeleteDate`, and related schema types.

## Pagination

MySQL uses `LIMIT` syntax:

```sql
-- Cap only
SELECT * FROM `Books` LIMIT 20;

-- Cap with offset
SELECT * FROM `Books` LIMIT 40, 20;
```

## Index Hints

The MySQL dialect supports `USE INDEX` hints:

```javascript
tmpQuery.indexHints = ['idx_genre'];
```

```sql
SELECT `Books`.* FROM `Books` USE INDEX (idx_genre) WHERE ...;
```

## Joins

```sql
INNER JOIN Authors ON Authors.IDAuthor = Books.IDAuthor
LEFT JOIN Publishers ON Publishers.IDPublisher = Books.IDPublisher
```

## DISTINCT

```sql
SELECT DISTINCT `Genre` FROM `Books`;
SELECT COUNT(DISTINCT `Books`.`IDBook`) AS RowCount FROM `Books`;
```

## Soft Delete

When a schema has a `Deleted` column type, the Delete operation generates an UPDATE:

```sql
UPDATE `Books` SET Deleted = 1, DeleteDate = NOW(3),
  UpdateDate = NOW(3), DeleteIDUser = :DeleteIDUser_3
  WHERE `Books`.`IDBook` = :IDBook_w0;
```

## Query Overrides

The MySQL dialect supports underscore-style templates for Read and Count queries.  The available template variables are:

| Variable | Description |
|----------|-------------|
| `<%= FieldList %>` | Generated column list |
| `<%= TableName %>` | Table name with backtick quoting |
| `<%= Where %>` | WHERE clause (including the keyword) |
| `<%= Join %>` | JOIN clauses |
| `<%= OrderBy %>` | ORDER BY clause |
| `<%= Limit %>` | LIMIT clause |
| `<%= IndexHints %>` | USE INDEX clause |
| `<%= Distinct %>` | DISTINCT keyword (if set) |
| `<%= _Params %>` | Full parameters object |
