/**
* FoxHound Solr Dialect
*
* Generates Solr query descriptors and Lucene query strings.
* The query body is a JSON string; the parsed operation object is also
* stored in query.parameters.solrOperation for direct provider consumption.
*
* @license MIT
*
* @author Steven Velozo <steven@velozo.com>
* @class FoxHoundDialectSolr
*/

var FoxHoundDialectSolr = function(pFable)
{
	let _Fable = pFable;

	/**
	* Strip any table-name prefix from a column name.
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
		var tmpColumn = pColumn.replace(/[`"]/g, '');
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
	* Escape special Lucene characters in a value.
	*
	* @method escapeValue
	* @param {String} pValue The value to escape
	* @return {String} Escaped value
	*/
	var escapeValue = function(pValue)
	{
		if (typeof pValue !== 'string')
		{
			return pValue;
		}
		// Escape Lucene special chars: + - & | ! ( ) { } [ ] ^ " ~ * ? : \ /
		return pValue.replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, '\\$1');
	};

	/**
	* Format a value for inclusion in a Solr Lucene query.
	* Strings are double-quoted, numbers stay bare.
	*
	* @method formatSolrValue
	* @param {*} pValue The value to format
	* @return {String} Formatted value string
	*/
	var formatSolrValue = function(pValue)
	{
		if (typeof pValue === 'number')
		{
			return String(pValue);
		}
		if (typeof pValue === 'boolean')
		{
			return pValue ? '1' : '0';
		}
		return '"' + escapeValue(String(pValue)) + '"';
	};

	/**
	* Translate a single FoxHound filter entry into a Solr Lucene clause.
	*
	* @method translateOperator
	* @param {Object} pFilterEntry A FoxHound filter object
	* @return {String} Solr Lucene clause
	*/
	var translateOperator = function(pFilterEntry)
	{
		var tmpColumn = stripTablePrefix(pFilterEntry.Column);
		var tmpValue = pFilterEntry.Value;

		switch (pFilterEntry.Operator)
		{
			case '=':
				return tmpColumn + ':' + formatSolrValue(tmpValue);
			case '!=':
				return '(*:* NOT ' + tmpColumn + ':' + formatSolrValue(tmpValue) + ')';
			case '>':
				return tmpColumn + ':{' + formatSolrValue(tmpValue) + ' TO *}';
			case '>=':
				return tmpColumn + ':[' + formatSolrValue(tmpValue) + ' TO *]';
			case '<':
				return tmpColumn + ':{* TO ' + formatSolrValue(tmpValue) + '}';
			case '<=':
				return tmpColumn + ':[* TO ' + formatSolrValue(tmpValue) + ']';
			case 'LIKE':
				// Convert SQL LIKE pattern to Solr wildcard: % -> *, _ -> ?
				var tmpPattern = String(tmpValue).replace(/%/g, '*').replace(/_/g, '?');
				return tmpColumn + ':' + tmpPattern;
			case 'IN':
				var tmpInValues = Array.isArray(tmpValue) ? tmpValue : [tmpValue];
				var tmpInParts = [];
				for (var i = 0; i < tmpInValues.length; i++)
				{
					tmpInParts.push(formatSolrValue(tmpInValues[i]));
				}
				return tmpColumn + ':(' + tmpInParts.join(' OR ') + ')';
			case 'NOT IN':
				var tmpNinValues = Array.isArray(tmpValue) ? tmpValue : [tmpValue];
				var tmpNinParts = [];
				for (var j = 0; j < tmpNinValues.length; j++)
				{
					tmpNinParts.push(formatSolrValue(tmpNinValues[j]));
				}
				return '(*:* NOT ' + tmpColumn + ':(' + tmpNinParts.join(' OR ') + '))';
			case 'IS NULL':
				return '(*:* NOT ' + tmpColumn + ':[* TO *])';
			case 'IS NOT NULL':
				return tmpColumn + ':[* TO *]';
			default:
				return tmpColumn + ':' + formatSolrValue(tmpValue);
		}
	};

	/**
	* Generate the Solr filter query string from the FoxHound filter array.
	* Uses a stack-based approach for parenthetical groups.
	*
	* @method generateFilter
	* @param {Object} pParameters Query Parameters
	* @return {String} Solr filter query string or empty string
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

				var tmpHasOR = false;
				for (var g = 0; g < tmpGroupConditions.length; g++)
				{
					if (tmpGroupConditions[g].connector === 'OR')
					{
						tmpHasOR = true;
						break;
					}
				}

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

		return tmpFilterText;
	};

	/**
	* Generate the field list for a Solr query from dataElements.
	*
	* @method generateFieldList
	* @param {Object} pParameters Query Parameters
	* @return {String} Comma-separated field list or '*' for all fields
	*/
	var generateFieldList = function(pParameters)
	{
		var tmpDataElements = pParameters.dataElements;

		if (!Array.isArray(tmpDataElements) || tmpDataElements.length < 1)
		{
			return '*';
		}

		var tmpFields = [];
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

		if (tmpFields.length === 0)
		{
			return '*';
		}

		return tmpFields.join(',');
	};

	/**
	* Generate Solr sort string from sort array.
	*
	* @method generateSort
	* @param {Object} pParameters Query Parameters
	* @return {String} Sort string (e.g. "Name asc, Age desc") or empty string
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
			var tmpDir = (tmpSort[i].Direction === 'Descending') ? 'desc' : 'asc';
			tmpParts.push(tmpColumn + ' ' + tmpDir);
		}

		return tmpParts.join(', ');
	};

	/**
	* Generate the document for an add operation.
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
	* Generate the atomic update document for an update operation.
	* Uses Solr's atomic update syntax: { "field": { "set": value } }
	*
	* @method generateUpdateDocument
	* @param {Object} pParameters Query Parameters
	* @return {Object|false} Atomic update document or false
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
						tmpUpdateDoc[tmpColumn] = { 'set': tmpRecords[0][tmpColumn] };
					}
					else
					{
						tmpUpdateDoc[tmpColumn] = { 'set': '$$NOW' };
					}
					break;
				case 'UpdateIDUser':
					tmpUpdateDoc[tmpColumn] = { 'set': pParameters.query.IDUser };
					break;
				default:
					tmpUpdateDoc[tmpColumn] = { 'set': tmpRecords[0][tmpColumn] };
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
	* Generate the soft-delete atomic update fields.
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
					tmpSetters[tmpSchemaEntry.Column] = { 'set': 1 };
					tmpHasDeletedField = true;
					break;
				case 'DeleteDate':
					tmpSetters[tmpSchemaEntry.Column] = { 'set': '$$NOW' };
					break;
				case 'UpdateDate':
					tmpSetters[tmpSchemaEntry.Column] = { 'set': '$$NOW' };
					break;
				case 'DeleteIDUser':
					tmpSetters[tmpSchemaEntry.Column] = { 'set': pParameters.query.IDUser };
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
	* Generate the undelete atomic update fields.
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
					tmpSetters[tmpSchemaEntry.Column] = { 'set': 0 };
					tmpHasDeletedField = true;
					break;
				case 'UpdateDate':
					tmpSetters[tmpSchemaEntry.Column] = { 'set': '$$NOW' };
					break;
				case 'UpdateIDUser':
					tmpSetters[tmpSchemaEntry.Column] = { 'set': pParameters.query.IDUser };
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
			collection: pParameters.scope,
			operation: 'add',
			document: tmpDocument
		};

		if (tmpCounterScope)
		{
			tmpResult.counterScope = tmpCounterScope;
		}

		pParameters.query.parameters.solrOperation = tmpResult;

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
			_Fable.log.warn('Solr dialect does not support JOINs; join parameter will be ignored.');
		}

		var tmpFilterQuery = generateFilter(pParameters);
		var tmpFieldList = generateFieldList(pParameters);
		var tmpSort = generateSort(pParameters);

		var tmpResult = {
			collection: pParameters.scope,
			operation: 'search',
			query: '*:*'
		};

		if (tmpFilterQuery)
		{
			tmpResult.filterQuery = tmpFilterQuery;
		}

		if (tmpFieldList !== '*')
		{
			tmpResult.fields = tmpFieldList;
		}

		if (tmpSort)
		{
			tmpResult.sort = tmpSort;
		}

		if (pParameters.cap)
		{
			tmpResult.rows = pParameters.cap;
		}

		if (pParameters.begin !== false && pParameters.begin > 0)
		{
			tmpResult.start = pParameters.begin;
		}

		if (pParameters.distinct)
		{
			tmpResult.distinct = true;
		}

		pParameters.query.parameters.solrOperation = tmpResult;

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
		var tmpFilterQuery = generateFilter(pParameters);
		var tmpUpdateDoc = generateUpdateDocument(pParameters);

		if (!tmpUpdateDoc)
		{
			return false;
		}

		var tmpResult = {
			collection: pParameters.scope,
			operation: 'atomicUpdate',
			filterQuery: tmpFilterQuery || '*:*',
			update: tmpUpdateDoc
		};

		pParameters.query.parameters.solrOperation = tmpResult;

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
		var tmpFilterQuery = generateFilter(pParameters);

		if (tmpDeleteSetters)
		{
			// Soft delete via atomic update
			var tmpResult = {
				collection: pParameters.scope,
				operation: 'atomicUpdate',
				filterQuery: tmpFilterQuery || '*:*',
				update: tmpDeleteSetters
			};
			pParameters.query.parameters.solrOperation = tmpResult;
			return JSON.stringify(tmpResult);
		}
		else
		{
			// Hard delete
			var tmpHardResult = {
				collection: pParameters.scope,
				operation: 'deleteByQuery',
				filterQuery: tmpFilterQuery || '*:*'
			};
			pParameters.query.parameters.solrOperation = tmpHardResult;
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
		var tmpDeleteTrackingState = pParameters.query.disableDeleteTracking;
		pParameters.query.disableDeleteTracking = true;
		var tmpFilterQuery = generateFilter(pParameters);
		pParameters.query.disableDeleteTracking = tmpDeleteTrackingState;

		if (tmpUndeleteSetters)
		{
			var tmpResult = {
				collection: pParameters.scope,
				operation: 'atomicUpdate',
				filterQuery: tmpFilterQuery || '*:*',
				update: tmpUndeleteSetters
			};
			pParameters.query.parameters.solrOperation = tmpResult;
			return JSON.stringify(tmpResult);
		}
		else
		{
			var tmpNoopResult = {
				collection: pParameters.scope,
				operation: 'noop'
			};
			pParameters.query.parameters.solrOperation = tmpNoopResult;
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
		var tmpFilterQuery = generateFilter(pParameters);

		var tmpResult = {
			collection: pParameters.scope,
			operation: 'search',
			query: '*:*',
			rows: 0,
			isCount: true
		};

		if (tmpFilterQuery)
		{
			tmpResult.filterQuery = tmpFilterQuery;
		}

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

		pParameters.query.parameters.solrOperation = tmpResult;

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
			get: function() { return 'Solr'; },
			enumerable: true
		});

	return tmpDialect;
};

module.exports = FoxHoundDialectSolr;
