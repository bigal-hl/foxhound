# MSSQL Dialect

The MSSQL dialect generates SQL compatible with Microsoft SQL Server.

## Identifier Quoting

MSSQL uses square bracket quoting for identifiers:

```sql
SELECT [Books].* FROM [Books] WHERE [Genre] = @Genre_w0;
```

## Named Parameters

The MSSQL dialect uses `@name` syntax for named parameters:

```sql
INSERT INTO [Books] ( [Title], [Author]) VALUES ( @Title_0, @Author_1);
```

## Parameter Types

MSSQL requires typed parameters for prepared statements.  FoxHound automatically generates type information in `query.parameterTypes` based on the schema:

| Schema Type | MSSQL Parameter Type |
|------------|---------------------|
| `AutoIdentity`, `CreateIDUser`, `UpdateIDUser`, `DeleteIDUser`, `Integer` | `Int` |
| `Deleted`, `Boolean` | `TinyInt` |
| `Decimal` | `Decimal` |
| `String`, `AutoGUID` | `VarChar` |
| `CreateDate`, `UpdateDate`, `DeleteDate`, `DateTime` | `DateTime` |

## Timestamp Function

MSSQL uses `GETUTCDATE()` for timestamp generation, providing UTC timestamps for consistency across time zones.

## Pagination

MSSQL uses `OFFSET ... FETCH` syntax (requires an `ORDER BY` clause):

```sql
-- Cap only
SELECT * FROM [Books] ORDER BY [IDBook] OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY;

-- Cap with offset
SELECT * FROM [Books] ORDER BY [IDBook] OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY;
```

> **Important:** You must include at least one sort column when using pagination with MSSQL, as the `OFFSET ... FETCH` clause requires an `ORDER BY`.

## Index Hints

The MSSQL dialect supports `WITH(INDEX(...))` hints:

```javascript
tmpQuery.indexHints = ['IX_Genre'];
```

```sql
SELECT [Books].* FROM [Books] WITH(INDEX(IX_Genre)) WHERE ...;
```

## Joins

```sql
INNER JOIN [Authors] ON Authors.IDAuthor = Books.IDAuthor
```

## AutoIdentity on INSERT

Unlike MySQL, the MSSQL dialect omits the `AutoIdentity` column entirely from INSERT statements (rather than inserting NULL).  This avoids errors with SQL Server's identity column behavior.

## Count Alias

The MSSQL dialect uses `Row_Count` instead of `RowCount` as the count alias, because `RowCount` can conflict with SQL Server reserved keywords:

```sql
SELECT COUNT(*) AS Row_Count FROM [Books];
```

## Query Overrides

The MSSQL dialect supports the same template variables as MySQL:

| Variable | Description |
|----------|-------------|
| `<%= FieldList %>` | Generated column list |
| `<%= TableName %>` | Table name with bracket quoting |
| `<%= Where %>` | WHERE clause |
| `<%= Join %>` | JOIN clauses |
| `<%= OrderBy %>` | ORDER BY clause |
| `<%= Limit %>` | OFFSET/FETCH clause |
| `<%= IndexHints %>` | WITH(INDEX(...)) clause |
| `<%= Distinct %>` | DISTINCT keyword (if set) |
| `<%= _Params %>` | Full parameters object |
