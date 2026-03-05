# JSON Column Support

> Automatic serialization and JSON path filtering for structured data columns

FoxHound provides schema-aware handling of JSON data types. When a schema with `JSON` or `JSONProxy` columns is attached, FoxHound automatically serializes object values on write and generates dialect-specific JSON path expressions for filtering.

## Schema Types

### JSON

The SQL column and JavaScript property share the same name.

```javascript
{ Column: 'Metadata', Type: 'JSON' }
```

### JSONProxy

The SQL column differs from the JavaScript property. The `StorageColumn` specifies the actual SQL column.

```javascript
{ Column: 'Preferences', Type: 'JSONProxy', StorageColumn: 'PreferencesJSON' }
```

## Write Operations (Create / Update)

On CREATE and UPDATE, FoxHound automatically calls `JSON.stringify` on JSON column values:

```javascript
tmpQuery.query.schema = [
	{ Column: 'IDProduct', Type: 'AutoIdentity' },
	{ Column: 'Name', Type: 'String' },
	{ Column: 'Metadata', Type: 'JSON' },
	{ Column: 'Preferences', Type: 'JSONProxy', StorageColumn: 'PreferencesJSON' }
];

tmpQuery.addRecord({
	Name: 'Widget',
	Metadata: { color: 'blue' },
	Preferences: { theme: 'dark' }
});
tmpQuery.setDialect('MySQL').buildCreateQuery();
```

Generated SQL:

```sql
INSERT INTO Product (Name, Metadata, PreferencesJSON)
VALUES (:Name_0, :Metadata_1, :Preferences_2);
```

Parameters:

```javascript
{
	Name_0: 'Widget',
	Metadata_1: '{"color":"blue"}',          // JSON.stringify'd
	Preferences_2: '{"theme":"dark"}'         // JSON.stringify'd, stored in PreferencesJSON
}
```

Key behaviors:
- **JSON**: Column name in SQL matches the property name. Value is serialized.
- **JSONProxy**: `StorageColumn` is used as the SQL column name. Value is serialized from the virtual property.
- If a value is already a string, it is passed through without double-serialization.

## JSON Path Filtering

FoxHound supports filtering on nested JSON properties using dot notation in column names. When a filter column contains a dot and the base name matches a JSON or JSONProxy schema entry, FoxHound generates a JSON path expression.

### Usage

```javascript
tmpQuery
	.addFilter('Metadata.color', 'blue')
	.addFilter('Metadata.weight', 100, '>')
	.addFilter('Metadata.dimensions.height', 50, '>=');
```

### Dialect Output

#### MySQL

```sql
WHERE JSON_EXTRACT(`Metadata`, '$.color') = :Metadata_color_w0
  AND JSON_EXTRACT(`Metadata`, '$.weight') > :Metadata_weight_w1
  AND JSON_EXTRACT(`Metadata`, '$.dimensions.height') >= :Metadata_dimensions_height_w2
```

#### PostgreSQL

Single-level paths use the `->>` operator; nested paths use `#>>`:

```sql
WHERE "Metadata"->>'color' = :Metadata_color_w0
  AND "Metadata"->>'weight' > :Metadata_weight_w1
  AND "Metadata"#>>'{dimensions,height}' >= :Metadata_dimensions_height_w2
```

#### SQLite

```sql
WHERE json_extract(`Metadata`, '$.color') = :Metadata_color_w0
  AND json_extract(`Metadata`, '$.weight') > :Metadata_weight_w1
  AND json_extract(`Metadata`, '$.dimensions.height') >= :Metadata_dimensions_height_w2
```

#### MSSQL

```sql
WHERE JSON_VALUE([Metadata], '$.color') = @Metadata_color_w0
  AND JSON_VALUE([Metadata], '$.weight') > @Metadata_weight_w1
  AND JSON_VALUE([Metadata], '$.dimensions.height') >= @Metadata_dimensions_height_w2
```

### JSONProxy Resolution

For `JSONProxy` columns, the storage column name is automatically used in the generated SQL. Filtering on `Preferences.theme` when `Preferences` has `StorageColumn: 'PreferencesJSON'`:

```sql
-- MySQL
WHERE JSON_EXTRACT(`PreferencesJSON`, '$.theme') = :Preferences_theme_w0

-- PostgreSQL
WHERE "PreferencesJSON"->>'theme' = :Preferences_theme_w0
```

### Supported Operators

All standard filter operators work with JSON path expressions: `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`.

### ALASQL Limitation

ALASQL does not support JSON path functions. JSON columns work for basic CRUD (values are serialized/deserialized), but JSON path filtering is not available.

## Database Requirements

JSON path filtering requires these minimum database versions:

| Database | Minimum Version | Function Used |
|----------|----------------|---------------|
| MySQL | 5.7 | `JSON_EXTRACT` |
| PostgreSQL | 9.3 | `->>` / `#>>` |
| SQLite | 3.38 | `json_extract` |
| SQL Server | 2016 | `JSON_VALUE` |
