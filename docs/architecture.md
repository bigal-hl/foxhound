# Architecture

FoxHound follows a clean separation between query configuration, dialect-specific generation, and result handling.

## Overview

```mermaid
graph TD
    A[Application Code] -->|configure| B[FoxHound Core]
    B -->|setDialect| C{Dialect Engine}
    C -->|MySQL| D[MySQL Generator]
    C -->|PostgreSQL| E[PostgreSQL Generator]
    C -->|MSSQL| F[MSSQL Generator]
    C -->|SQLite| G[SQLite Generator]
    C -->|ALASQL| H[ALASQL Generator]
    C -->|English| I[English Generator]
    D --> J[Query Output]
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    J -->|query.body| K[SQL String]
    J -->|query.parameters| L[Bound Values]
```

## Query Lifecycle

```mermaid
sequenceDiagram
    participant App as Application
    participant FH as FoxHound
    participant D as Dialect
    participant P as Parameters

    App->>FH: libFoxHound.new(_Fable)
    FH->>P: Initialize Parameters
    App->>FH: setScope('Books')
    App->>FH: addFilter('Genre', 'Sci-Fi')
    App->>FH: setDialect('MySQL')
    App->>FH: buildReadQuery()
    FH->>D: Read(parameters)
    D->>D: generateFieldList()
    D->>D: generateWhere()
    D->>D: generateOrderBy()
    D->>D: generateLimit()
    D-->>FH: SQL string
    FH->>P: Store in query.body
    App->>FH: query.body
    FH-->>App: SELECT `Books`.* FROM `Books` WHERE ...
```

## Component Architecture

```mermaid
graph LR
    subgraph FoxHound Core
        A[FoxHound.js] --> B[Parameters.js]
        A --> C[Foxhound-Dialects.js]
    end

    subgraph Dialect Modules
        C --> D[MySQL]
        C --> E[PostgreSQL]
        C --> F[MSSQL]
        C --> G[SQLite]
        C --> H[ALASQL]
        C --> I[English]
        C --> J[MeadowEndpoints]
    end

    subgraph External
        K[Fable] --> A
        L[Meadow] --> A
        M[Stricture] --> B
    end
```

## Factory Pattern

FoxHound uses a factory constructor pattern.  The module exports a bare constructor; you create instances by calling `.new()` with a Fable service context:

```javascript
var libFoxHound = require('foxhound');
var tmpQuery = libFoxHound.new(_Fable);
```

Every query instance gets its own UUID and independent parameter state, so multiple queries can be built concurrently without interference.

## Parameters Object

All query state lives in a single `Parameters` object:

| Property | Type | Purpose |
|----------|------|---------|
| `scope` | String | Table or collection name |
| `dataElements` | Array | Column/field list |
| `begin` | Integer | Pagination start offset |
| `cap` | Integer | Maximum rows to return |
| `filter` | Array | Filter expression objects |
| `sort` | Array | Sort expression objects |
| `join` | Array | Join expression objects |
| `query` | Object | Generated query body, schema, records, and bound parameters |
| `queryOverride` | String | Custom query template |
| `indexHints` | Array | Index hints for the database engine |
| `userID` | Integer | The acting user (for audit stamps) |
| `result` | Object | Execution results (value, error, executed flag) |

## Dialect Strategy

Each dialect is a module that exports a factory function accepting a Fable instance.  The returned object exposes six methods that each accept a Parameters object and return a SQL string:

```mermaid
classDiagram
    class Dialect {
        +Create(pParameters) String
        +Read(pParameters) String
        +Update(pParameters) String
        +Delete(pParameters) String
        +Undelete(pParameters) String
        +Count(pParameters) String
        +name String
    }

    class MySQL {
        +backtick quoting
        +colon parameters
        +NOW 3 timestamps
    }

    class PostgreSQL {
        +double-quote quoting
        +colon parameters
        +NOW timestamps
        +RETURNING clause
    }

    class MSSQL {
        +bracket quoting
        +at-sign parameters
        +GETUTCDATE timestamps
        +OFFSET FETCH pagination
    }

    Dialect <|-- MySQL
    Dialect <|-- PostgreSQL
    Dialect <|-- MSSQL
```

The dialect handles all syntax differences: quoting identifiers, parameter prefixes, pagination syntax, date functions, and identity column handling.

## Chainable API

Every setter method returns `this`, enabling fluent composition:

```javascript
tmpQuery
	.setScope('Orders')
	.setDataElements(['OrderID', 'Total', 'Status'])
	.addFilter('Status', 'Pending')
	.addSort({Column: 'Total', Direction: 'Descending'})
	.setCap(50)
	.setDialect('MySQL')
	.buildReadQuery();
```

## Fable Integration

FoxHound depends on Fable for:

- **UUID Generation** -- each query and record gets a unique identifier via `_Fable.getUUID()`
- **Logging** -- filter, scope, and query errors are logged through `_Fable.log`
- **Utility Functions** -- `_Fable.Utility.extend()` for parameter merging and `_Fable.Utility.template()` for query overrides
- **Configuration** -- inherits any relevant settings from the Fable config

## Schema-Aware Generation

```mermaid
flowchart TD
    A[Record Object] --> B{Schema Attached?}
    B -->|No| C[All columns parameterized]
    B -->|Yes| D[Check each column type]
    D --> E{AutoIdentity?}
    E -->|Yes| F[NULL / DEFAULT / Skip]
    D --> G{CreateDate?}
    G -->|Yes| H[NOW timestamp]
    D --> I{Deleted?}
    I -->|Yes| J[Auto-filter on Read]
    D --> K{Default?}
    K -->|Yes| L[Parameterized value]
    C --> M[Generate SQL]
    F --> M
    H --> M
    J --> M
    L --> M
```
