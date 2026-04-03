/**
* FoxHound DGraph Dialect
*
* Generates DQL query strings and JSON mutation descriptors for DGraph.
* The query body is a JSON string; the parsed operation object is also
* stored in query.parameters.dgraphOperation for direct provider consumption.
*
* @license MIT
*
* @author Steven Velozo <steven@velozo.com>
* @class FoxHoundDialectDGraph
*/

var FoxHoundDialectDGraph = function(pFable)
{
	let _Fable = pFable;

	/**
	* Strip any table-name prefix from a column name.
	* DGraph uses plain predicate names without table qualification.
	*
	* @method stripTablePrefix
	* @param {String} pColumn Column name, possibly table-qualified
	* @return {String} Plain column name
	*/
	var stripTablePrefix = function(pColumn)
	{
		if (typeof pColumn !== 'string')
		{
			return pColumn;
		}
		// Remove backtick and double-quote quoting
		var tmpColumn = pColumn.replace(/[`"]/g, '');
		// Strip table prefix (e.g. "Animal.Name" -> "Name")
		if (tmpColumn.indexOf('.') >= 0)
		{
			var tmpParts = tmpColumn.split('.');
			if (tmpParts[tmpParts.length - 1] === '*')
			{
				return '*';
			}
			return tmpParts[tmpParts.length - 1];
		}
		return tmpColumn;
	};

	/**
	* Find the schema entry for a given column name.
	*
	* @method findSchemaEntry
	* @param {String} pColumn Column name
	* @param {Array} pSchema Schema array
	* @return {Object} Schema entry or default
	*/
	var findSchemaEntry = function(pColumn, pSchema)
	{
		for (var i = 0; i < pSchema.length; i++)
		{
			if (pColumn == pSchema[i].Column)
			{
				return pSchema[i];
			}
		}
		return { Column: pColumn, Type: 'Default' };
	};

	/**
	* Format a value for inclusion in a DQL string.
	* Strings are double-quoted, numbers stay bare, arrays become bracketed.
	*
	* @method formatDGraphValue
	* @param {*} pValue The value to format
	* @return {String} Formatted value string
	*/
	var formatDGraphValue = function(pValue)
	{
		if (Array.isArray(pValue))
		{
			var tmpItems = [];
			for (var i = 0; i < pValue.length; i++)
			{
				tmpItems.push(formatDGraphValue(pValue[i]));
			}
			return '[' + tmpItems.join(', ') + ']';
		}
		if (typeof pValue === 'number')
		{
			return String(pValue);
		}
		if (typeof pValue === 'boolean')
		{
			return pValue ? 'true' : 'false';
		}
		// Escape double quotes inside strings
		return '"' + String(pValue).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
	};

	/**
	* Translate a single FoxHound filter entry into a DGraph DQL filter function call.
	*
	* @method translateOperator
	* @param {Object} pFilterEntry A FoxHound filter object
	* @return {String} DQL filter function string
	*/
	var translateOperator = function(pFilterEntry)
	{
		var tmpColumn = stripTablePrefix(pFilterEntry.Column);
		var tmpValue = pFilterEntry.Value;

		switch (pFilterEntry.Operator)
		{
			case '=':
				return 'eq(' + tmpColumn + ', ' + formatDGraphValue(tmpValue) + ')';
			case '!=':
				return 'NOT eq(' + tmpColumn + ', ' + formatDGraphValue(tmpValue) + ')';
			case '>':
				return 'gt(' + tmpColumn + ', ' + formatDGraphValue(tmpValue) + ')';
			case '>=':
				return 'ge(' + tmpColumn + ', ' + formatDGraphValue(tmpValue) + ')';
			case '<':
				return 'lt(' + tmpColumn + ', ' + formatDGraphValue(tmpValue) + ')';
			case '<=':
				return 'le(' + tmpColumn + ', ' + formatDGraphValue(tmpValue) + ')';
			case 'LIKE':
				// Convert SQL LIKE pattern to regex: % -> .*, _ -> .
				var tmpPattern = String(tmpValue).replace(/%/g, '.*').replace(/_/g, '.');
				return 'regexp(' + tmpColumn + ', /' + tmpPattern + '/i)';
			case 'IN':
				// DGraph eq() supports array values as IN
				var tmpInValues = Array.isArray(tmpValue) ? tmpValue : [tmpValue];
				return 'eq(' + tmpColumn + ', ' + formatDGraphValue(tmpInValues) + ')';
			case 'NOT IN':
				var tmpNinValues = Array.isArray(tmpValue) ? tmpValue : [tmpValue];
				return 'NOT eq(' + tmpColumn + ', ' + formatDGraphValue(tmpNinValues) + ')';
			case 'IS NULL':
				return 'NOT has(' + tmpColumn + ')';
			case 'IS NOT NULL':
				return 'has(' + tmpColumn + ')';
			default:
				// Unknown operator, treat as equality
				return 'eq(' + tmpColumn + ', ' + formatDGraphValue(tmpValue) + ')';
		}
	};

	/**
	* Generate the DGraph @filter(...) clause from the FoxHound filter array.
	* Uses a stack-based approach for parenthetical groups.
	*
	* @method generateFilter
	* @param {Object} pParameters Query Parameters
	* @return {String} DQL @filter clause or empty string
	*/
	var generateFilter = function(pParameters)
	{
		var tmpFilter = Array.isArray(pParameters.filter) ? pParameters.filter.slice() : [];

		// Auto-add Deleted filter if applicable
		if (!pParameters.query.disableDeleteTracking)
		{
			var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
			for (var i = 0; i < tmpSchema.length; i++)
			{
				if (tmpSchema[i].Type === 'Deleted')
				{
					var tmpHasDeletedParam = false;
					for (var x = 0; x < tmpFilter.length; x++)
					{
						if (stripTablePrefix(tmpFilter[x].Column) === tmpSchema[i].Column)
						{
							tmpHasDeletedParam = true;
							break;
						}
					}
					if (!tmpHasDeletedParam)
					{
						tmpFilter.push(
						{
							Column: tmpSchema[i].Column,
							Operator: '=',
							Value: 0,
							Connector: 'AND',
							Parameter: 'Deleted'
						});
					}
					break;
				}
			}
		}

		if (tmpFilter.length < 1)
		{
			return '';
		}

		// Stack-based processing for parenthetical groups
		// Each stack level is an array of { text: 'eq(...)', connector: 'AND' }
		var tmpStack = [[]];

		for (var i = 0; i < tmpFilter.length; i++)
		{
			var tmpEntry = tmpFilter[i];

			if (tmpEntry.Operator === '(')
			{
				tmpStack.push([]);
			}
			else if (tmpEntry.Operator === ')')
			{
				var tmpGroupConditions = tmpStack.pop();

				// Check if any condition inside the group used OR
				var tmpHasOR = false;
				for (var g = 0; g < tmpGroupConditions.length; g++)
				{
					if (tmpGroupConditions[g].connector === 'OR')
					{
						tmpHasOR = true;
						break;
					}
				}

				// Join conditions in the group
				var tmpGroupText = '';
				for (var g2 = 0; g2 < tmpGroupConditions.length; g2++)
				{
					if (g2 > 0)
					{
						tmpGroupText += tmpHasOR ? ' OR ' : ' AND ';
					}
					tmpGroupText += tmpGroupConditions[g2].text;
				}

				tmpStack[tmpStack.length - 1].push({
					text: '(' + tmpGroupText + ')',
					connector: tmpEntry.Connector || 'AND'
				});
			}
			else
			{
				tmpStack[tmpStack.length - 1].push({
					text: translateOperator(tmpEntry),
					connector: tmpEntry.Connector || 'AND'
				});
			}
		}

		// Collapse root level
		var tmpRootConditions = tmpStack[0];
		if (tmpRootConditions.length === 0)
		{
			return '';
		}

		var tmpFilterText = '';
		for (var r = 0; r < tmpRootConditions.length; r++)
		{
			if (r > 0)
			{
				tmpFilterText += ' ' + tmpRootConditions[r].connector + ' ';
			}
			tmpFilterText += tmpRootConditions[r].text;
		}

		return ' @filter(' + tmpFilterText + ')';
	};

	/**
	* Generate the field list for a DQL query from dataElements.
	* Always includes uid. Falls back to all schema columns if no dataElements.
	*
	* @method generateFieldList
	* @param {Object} pParameters Query Parameters
	* @return {String} Space-separated field list
	*/
	var generateFieldList = function(pParameters)
	{
		var tmpFields = ['uid'];
		var tmpDataElements = pParameters.dataElements;

		if (Array.isArray(tmpDataElements) && tmpDataElements.length > 0)
		{
			for (var i = 0; i < tmpDataElements.length; i++)
			{
				var tmpField = tmpDataElements[i];
				if (Array.isArray(tmpField))
				{
					tmpField = tmpField[0];
				}
				tmpField = stripTablePrefix(tmpField);
				if (tmpField !== '*' && tmpFields.indexOf(tmpField) < 0)
				{
					tmpFields.push(tmpField);
				}
			}
		}
		else
		{
			// Use all schema columns
			var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
			for (var j = 0; j < tmpSchema.length; j++)
			{
				var tmpCol = tmpSchema[j].Column;
				if (tmpFields.indexOf(tmpCol) < 0)
				{
					tmpFields.push(tmpCol);
				}
			}
		}

		// If we still only have uid, include dgraph.type for completeness
		if (tmpFields.length === 1)
		{
			tmpFields.push('dgraph.type');
		}

		return tmpFields.join(' ');
	};

	/**
	* Generate DQL sort parameters from sort array.
	*
	* @method generateSort
	* @param {Object} pParameters Query Parameters
	* @return {String} Sort parameters (e.g. "orderasc: Name") or empty string
	*/
	var generateSort = function(pParameters)
	{
		var tmpSort = pParameters.sort;
		if (!Array.isArray(tmpSort) || tmpSort.length < 1)
		{
			return '';
		}

		var tmpParts = [];
		for (var i = 0; i < tmpSort.length; i++)
		{
			var tmpColumn = stripTablePrefix(tmpSort[i].Column);
			var tmpDir = (tmpSort[i].Direction === 'Descending') ? 'orderdesc' : 'orderasc';
			tmpParts.push(tmpDir + ': ' + tmpColumn);
		}

		return tmpParts.join(', ');
	};

	/**
	* Generate DQL pagination parameters from begin/cap.
	*
	* @method generatePagination
	* @param {Object} pParameters Query Parameters
	* @return {String} Pagination parameters (e.g. "first: 10, offset: 5") or empty string
	*/
	var generatePagination = function(pParameters)
	{
		var tmpParts = [];

		if (pParameters.cap)
		{
			tmpParts.push('first: ' + pParameters.cap);
		}

		if (pParameters.begin !== false && pParameters.begin > 0)
		{
			tmpParts.push('offset: ' + pParameters.begin);
		}

		return tmpParts.join(', ');
	};

	/**
	* Generate the document for a create (mutation set) operation.
	* Walks the record through the schema to handle special column types.
	*
	* @method generateCreateDocument
	* @param {Object} pParameters Query Parameters
	* @return {Object|false} Document object or false if no record
	*/
	var generateCreateDocument = function(pParameters)
	{
		var tmpRecords = pParameters.query.records;
		if (!Array.isArray(tmpRecords) || tmpRecords.length < 1)
		{
			return false;
		}

		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
		var tmpDocument = {};

		for (var tmpColumn in tmpRecords[0])
		{
			var tmpSchemaEntry = findSchemaEntry(tmpColumn, tmpSchema);

			if (!pParameters.query.disableDeleteTracking)
			{
				if (tmpSchemaEntry.Type === 'DeleteDate' ||
					tmpSchemaEntry.Type === 'DeleteIDUser')
				{
					continue;
				}
			}

			switch (tmpSchemaEntry.Type)
			{
				case 'AutoIdentity':
					if (pParameters.query.disableAutoIdentity)
					{
						tmpDocument[tmpColumn] = tmpRecords[0][tmpColumn];
					}
					else
					{
						tmpDocument[tmpColumn] = '$$AUTOINCREMENT';
					}
					break;
				case 'AutoGUID':
					if (pParameters.query.disableAutoIdentity)
					{
						tmpDocument[tmpColumn] = tmpRecords[0][tmpColumn];
					}
					else if (tmpRecords[0][tmpColumn] &&
							tmpRecords[0][tmpColumn].length >= 5 &&
							tmpRecords[0][tmpColumn] !== '0x0000000000000000')
					{
						tmpDocument[tmpColumn] = tmpRecords[0][tmpColumn];
					}
					else
					{
						tmpDocument[tmpColumn] = pParameters.query.UUID;
					}
					break;
				case 'UpdateDate':
				case 'CreateDate':
					if (pParameters.query.disableAutoDateStamp)
					{
						tmpDocument[tmpColumn] = tmpRecords[0][tmpColumn];
					}
					else
					{
						tmpDocument[tmpColumn] = '$$NOW';
					}
					break;
				case 'DeleteIDUser':
				case 'UpdateIDUser':
				case 'CreateIDUser':
					if (pParameters.query.disableAutoUserStamp)
					{
						tmpDocument[tmpColumn] = tmpRecords[0][tmpColumn];
					}
					else
					{
						tmpDocument[tmpColumn] = pParameters.query.IDUser;
					}
					break;
				case 'Deleted':
					tmpDocument[tmpColumn] = 0;
					break;
				default:
					tmpDocument[tmpColumn] = tmpRecords[0][tmpColumn];
					break;
			}
		}

		if (Object.keys(tmpDocument).length === 0)
		{
			return false;
		}

		return tmpDocument;
	};

	/**
	* Generate the update fields for a mutation operation.
	* Walks the record through the schema, skipping identity/create/delete columns.
	*
	* @method generateUpdateDocument
	* @param {Object} pParameters Query Parameters
	* @return {Object|false} Update document or false if no record
	*/
	var generateUpdateDocument = function(pParameters)
	{
		var tmpRecords = pParameters.query.records;
		if (!Array.isArray(tmpRecords) || tmpRecords.length < 1)
		{
			return false;
		}

		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
		var tmpUpdateDoc = {};

		for (var tmpColumn in tmpRecords[0])
		{
			var tmpSchemaEntry = findSchemaEntry(tmpColumn, tmpSchema);

			if (pParameters.query.disableAutoUserStamp &&
				tmpSchemaEntry.Type === 'UpdateIDUser')
			{
				continue;
			}

			switch (tmpSchemaEntry.Type)
			{
				case 'AutoIdentity':
				case 'CreateDate':
				case 'CreateIDUser':
				case 'DeleteDate':
				case 'DeleteIDUser':
					continue;
			}

			switch (tmpSchemaEntry.Type)
			{
				case 'UpdateDate':
					if (pParameters.query.disableAutoDateStamp)
					{
						tmpUpdateDoc[tmpColumn] = tmpRecords[0][tmpColumn];
					}
					else
					{
						tmpUpdateDoc[tmpColumn] = '$$NOW';
					}
					break;
				case 'UpdateIDUser':
					tmpUpdateDoc[tmpColumn] = pParameters.query.IDUser;
					break;
				default:
					tmpUpdateDoc[tmpColumn] = tmpRecords[0][tmpColumn];
					break;
			}
		}

		if (Object.keys(tmpUpdateDoc).length === 0)
		{
			return false;
		}

		return tmpUpdateDoc;
	};

	/**
	* Generate the soft-delete setters.
	* Returns false if no Deleted column exists or delete tracking is disabled.
	*
	* @method generateDeleteSetters
	* @param {Object} pParameters Query Parameters
	* @return {Object|false} Delete setters or false
	*/
	var generateDeleteSetters = function(pParameters)
	{
		if (pParameters.query.disableDeleteTracking)
		{
			return false;
		}

		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
		var tmpHasDeletedField = false;
		var tmpSetters = {};

		for (var i = 0; i < tmpSchema.length; i++)
		{
			var tmpSchemaEntry = tmpSchema[i];
			switch (tmpSchemaEntry.Type)
			{
				case 'Deleted':
					tmpSetters[tmpSchemaEntry.Column] = 1;
					tmpHasDeletedField = true;
					break;
				case 'DeleteDate':
					tmpSetters[tmpSchemaEntry.Column] = '$$NOW';
					break;
				case 'UpdateDate':
					tmpSetters[tmpSchemaEntry.Column] = '$$NOW';
					break;
				case 'DeleteIDUser':
					tmpSetters[tmpSchemaEntry.Column] = pParameters.query.IDUser;
					break;
				default:
					continue;
			}
		}

		if (!tmpHasDeletedField || Object.keys(tmpSetters).length === 0)
		{
			return false;
		}

		return tmpSetters;
	};

	/**
	* Generate the undelete setters.
	* Returns false if no Deleted column exists.
	*
	* @method generateUndeleteSetters
	* @param {Object} pParameters Query Parameters
	* @return {Object|false} Undelete setters or false
	*/
	var generateUndeleteSetters = function(pParameters)
	{
		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
		var tmpHasDeletedField = false;
		var tmpSetters = {};

		for (var i = 0; i < tmpSchema.length; i++)
		{
			var tmpSchemaEntry = tmpSchema[i];
			switch (tmpSchemaEntry.Type)
			{
				case 'Deleted':
					tmpSetters[tmpSchemaEntry.Column] = 0;
					tmpHasDeletedField = true;
					break;
				case 'UpdateDate':
					tmpSetters[tmpSchemaEntry.Column] = '$$NOW';
					break;
				case 'UpdateIDUser':
					tmpSetters[tmpSchemaEntry.Column] = pParameters.query.IDUser;
					break;
				default:
					continue;
			}
		}

		if (!tmpHasDeletedField || Object.keys(tmpSetters).length === 0)
		{
			return false;
		}

		return tmpSetters;
	};

	/**
	* Build the func: arguments portion of a DQL query root.
	* Combines type filter, pagination, and sort.
	*
	* @method buildFuncArgs
	* @param {String} pType DGraph type name
	* @param {String} pPagination Pagination string
	* @param {String} pSort Sort string
	* @return {String} Func arguments (e.g. "func: type(Animal), first: 10, orderasc: Name")
	*/
	var buildFuncArgs = function(pType, pPagination, pSort)
	{
		var tmpParts = ['func: type(' + pType + ')'];

		if (pPagination)
		{
			tmpParts.push(pPagination);
		}

		if (pSort)
		{
			tmpParts.push(pSort);
		}

		return tmpParts.join(', ');
	};


	/**
	* Create a new record
	*
	* @method Create
	* @param {Object} pParameters Query parameters
	* @return {String} JSON operation descriptor or false
	*/
	var Create = function(pParameters)
	{
		var tmpDocument = generateCreateDocument(pParameters);

		if (!tmpDocument)
		{
			return false;
		}

		// Add DGraph type predicate
		tmpDocument['dgraph.type'] = pParameters.scope;

		// Determine if we need a counter scope for auto-increment
		var tmpCounterScope = false;
		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
		for (var i = 0; i < tmpSchema.length; i++)
		{
			if (tmpSchema[i].Type === 'AutoIdentity' && !pParameters.query.disableAutoIdentity)
			{
				tmpCounterScope = pParameters.scope + '.' + tmpSchema[i].Column;
				break;
			}
		}

		var tmpResult = {
			type: pParameters.scope,
			operation: 'mutate',
			mutationType: 'set',
			document: tmpDocument
		};

		if (tmpCounterScope)
		{
			tmpResult.counterScope = tmpCounterScope;
		}

		pParameters.query.parameters.dgraphOperation = tmpResult;

		return JSON.stringify(tmpResult);
	};


	/**
	* Read one or many records
	*
	* @method Read
	* @param {Object} pParameters Query parameters
	* @return {String} JSON operation descriptor
	*/
	var Read = function(pParameters)
	{
		if (pParameters.join && Array.isArray(pParameters.join) && pParameters.join.length > 0)
		{
			_Fable.log.warn('DGraph dialect does not support JOINs; join parameter will be ignored.');
		}

		var tmpFilterClause = generateFilter(pParameters);
		var tmpFieldList = generateFieldList(pParameters);
		var tmpSort = generateSort(pParameters);
		var tmpPagination = generatePagination(pParameters);

		var tmpFuncArgs = buildFuncArgs(pParameters.scope, tmpPagination, tmpSort);

		var tmpDQL = '{ results(' + tmpFuncArgs + ')' + tmpFilterClause + ' { ' + tmpFieldList + ' } }';

		var tmpResult = {
			type: pParameters.scope,
			operation: 'query',
			query: tmpDQL,
			queryName: 'results'
		};

		if (pParameters.distinct)
		{
			tmpResult.distinct = true;
		}

		pParameters.query.parameters.dgraphOperation = tmpResult;

		return JSON.stringify(tmpResult);
	};

	/**
	* Update one or many records
	*
	* @method Update
	* @param {Object} pParameters Query parameters
	* @return {String} JSON operation descriptor or false
	*/
	var Update = function(pParameters)
	{
		var tmpFilterClause = generateFilter(pParameters);
		var tmpUpdateDoc = generateUpdateDocument(pParameters);

		if (!tmpUpdateDoc)
		{
			return false;
		}

		// Build a DQL query to find the UIDs of matching nodes
		var tmpFuncArgs = buildFuncArgs(pParameters.scope, '', '');
		var tmpQueryForUIDs = '{ updateTargets(' + tmpFuncArgs + ')' + tmpFilterClause + ' { uid } }';

		var tmpResult = {
			type: pParameters.scope,
			operation: 'upsert',
			queryForUIDs: tmpQueryForUIDs,
			queryName: 'updateTargets',
			update: tmpUpdateDoc
		};

		pParameters.query.parameters.dgraphOperation = tmpResult;

		return JSON.stringify(tmpResult);
	};

	/**
	* Delete one or many records (soft or hard depending on schema)
	*
	* @method Delete
	* @param {Object} pParameters Query parameters
	* @return {String} JSON operation descriptor
	*/
	var Delete = function(pParameters)
	{
		var tmpDeleteSetters = generateDeleteSetters(pParameters);
		var tmpFilterClause = generateFilter(pParameters);

		// Build a DQL query to find the UIDs of matching nodes
		var tmpFuncArgs = buildFuncArgs(pParameters.scope, '', '');
		var tmpQueryForUIDs = '{ deleteTargets(' + tmpFuncArgs + ')' + tmpFilterClause + ' { uid } }';

		if (tmpDeleteSetters)
		{
			// Soft delete via mutation
			var tmpResult = {
				type: pParameters.scope,
				operation: 'upsert',
				queryForUIDs: tmpQueryForUIDs,
				queryName: 'deleteTargets',
				update: tmpDeleteSetters
			};
			pParameters.query.parameters.dgraphOperation = tmpResult;
			return JSON.stringify(tmpResult);
		}
		else
		{
			// Hard delete
			var tmpHardResult = {
				type: pParameters.scope,
				operation: 'delete',
				queryForUIDs: tmpQueryForUIDs,
				queryName: 'deleteTargets'
			};
			pParameters.query.parameters.dgraphOperation = tmpHardResult;
			return JSON.stringify(tmpHardResult);
		}
	};

	/**
	* Undelete (restore) a soft-deleted record
	*
	* @method Undelete
	* @param {Object} pParameters Query parameters
	* @return {String} JSON operation descriptor
	*/
	var Undelete = function(pParameters)
	{
		var tmpUndeleteSetters = generateUndeleteSetters(pParameters);

		// Temporarily disable delete tracking for filter generation
		// so we can find records where Deleted=1
		var tmpDeleteTrackingState = pParameters.query.disableDeleteTracking;
		pParameters.query.disableDeleteTracking = true;
		var tmpFilterClause = generateFilter(pParameters);
		pParameters.query.disableDeleteTracking = tmpDeleteTrackingState;

		if (tmpUndeleteSetters)
		{
			var tmpFuncArgs = buildFuncArgs(pParameters.scope, '', '');
			var tmpQueryForUIDs = '{ undeleteTargets(' + tmpFuncArgs + ')' + tmpFilterClause + ' { uid } }';

			var tmpResult = {
				type: pParameters.scope,
				operation: 'upsert',
				queryForUIDs: tmpQueryForUIDs,
				queryName: 'undeleteTargets',
				update: tmpUndeleteSetters
			};
			pParameters.query.parameters.dgraphOperation = tmpResult;
			return JSON.stringify(tmpResult);
		}
		else
		{
			// No-op -- can't undelete without a Deleted column
			var tmpNoopResult = {
				type: pParameters.scope,
				operation: 'noop'
			};
			pParameters.query.parameters.dgraphOperation = tmpNoopResult;
			return JSON.stringify(tmpNoopResult);
		}
	};

	/**
	* Count records
	*
	* @method Count
	* @param {Object} pParameters Query parameters
	* @return {String} JSON operation descriptor
	*/
	var Count = function(pParameters)
	{
		var tmpFilterClause = generateFilter(pParameters);

		var tmpFuncArgs = buildFuncArgs(pParameters.scope, '', '');

		var tmpDQL = '{ results(' + tmpFuncArgs + ')' + tmpFilterClause + ' { total: count(uid) } }';

		var tmpResult = {
			type: pParameters.scope,
			operation: 'query',
			query: tmpDQL,
			queryName: 'results',
			isCount: true
		};

		if (pParameters.distinct)
		{
			tmpResult.distinct = true;
			var tmpDataElements = pParameters.dataElements;
			if (Array.isArray(tmpDataElements) && tmpDataElements.length > 0)
			{
				var tmpFields = [];
				for (var i = 0; i < tmpDataElements.length; i++)
				{
					var tmpField = Array.isArray(tmpDataElements[i]) ? tmpDataElements[i][0] : tmpDataElements[i];
					tmpField = stripTablePrefix(tmpField);
					if (tmpField !== '*')
					{
						tmpFields.push(tmpField);
					}
				}
				if (tmpFields.length > 0)
				{
					tmpResult.distinctFields = tmpFields;
				}
			}
			else
			{
				// Fall back to AutoIdentity column from schema
				var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
				for (var j = 0; j < tmpSchema.length; j++)
				{
					if (tmpSchema[j].Type === 'AutoIdentity')
					{
						tmpResult.distinctFields = [tmpSchema[j].Column];
						break;
					}
				}
			}
		}

		pParameters.query.parameters.dgraphOperation = tmpResult;

		return JSON.stringify(tmpResult);
	};

	var tmpDialect = ({
		Create: Create,
		Read: Read,
		Update: Update,
		Delete: Delete,
		Undelete: Undelete,
		Count: Count
	});

	/**
	* Dialect Name
	*
	* @property name
	* @type string
	*/
	Object.defineProperty(tmpDialect, 'name',
		{
			get: function() { return 'DGraph'; },
			enumerable: true
		});

	return tmpDialect;
};

module.exports = FoxHoundDialectDGraph;
