/**
* FoxHound PostgreSQL Dialect
*
* @license MIT
*
* For a PostgreSQL query override:
// An underscore template with the following values:
//      <%= DataElements %> = Field1, Field2, Field3, Field4
//      <%= Begin %>        = 0
//      <%= Cap %>          = 10
//      <%= Filter %>       = WHERE StartDate > $1
//      <%= Sort %>         = ORDER BY Field1
// The values are empty strings if they aren't set.
*
* @author Steven Velozo <steven@velozo.com>
* @class FoxHoundDialectPostgreSQL
*/

var FoxHoundDialectPostgreSQL = function(pFable)
{
	const SQL_NOW = "NOW()";

	let _Fable = pFable;

	/**
	* Generate a table name from the scope
	*
	* @method: generateTableName
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the table name clause
	*/
	var generateTableName = function(pParameters)
	{
		if (pParameters.scope && pParameters.scope.indexOf('"') >= 0)
			return ' '+pParameters.scope+'';
		else
			return ' "'+pParameters.scope+'"';
	};

	/**
	* Generate a field list from the array of dataElements
	*
	* Each entry in the dataElements is a simple string
	*
	* @method: generateFieldList
	* @param: {Object} pParameters SQL Query Parameters
	* @param {Boolean} pIsForCountClause (optional) If true, generate fields for use within a count clause.
	* @return: {String} Returns the field list clause, or empty string if explicit fields are requested but cannot be fulfilled
	*          due to missing schema.
	*/
	var generateFieldList = function(pParameters, pIsForCountClause)
	{
		var tmpDataElements = pParameters.dataElements;
		if (!Array.isArray(tmpDataElements) || tmpDataElements.length < 1)
		{
			const tmpTableName = generateTableName(pParameters);
			if (!pIsForCountClause)
			{
				return tmpTableName + '.*';
			}
			// we need to list all of the table fields explicitly; get them from the schema
			const tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
			if (tmpSchema.length < 1)
			{
				// this means we have no schema; returning an empty string here signals the calling code to handle this case
				return '';
			}
			const idColumn = tmpSchema.find((entry) => entry.Type === 'AutoIdentity');
			if (!idColumn)
			{
				// this means there is no autoincrementing unique ID column; treat as above
				return '';
			}
			const qualifiedIDColumn = `${tmpTableName}.${idColumn.Column}`;
			return ` ${generateSafeFieldName(qualifiedIDColumn)}`;
		}

		var tmpFieldList = ' ';
		for (var i = 0; i < tmpDataElements.length; i++)
		{
			if (i > 0)
			{
				tmpFieldList += ', ';
			}
			if (Array.isArray(tmpDataElements[i]))
			{
				tmpFieldList += generateSafeFieldName(tmpDataElements[i][0]);
				if (tmpDataElements[i].length > 1 && tmpDataElements[i][1])
				{
					tmpFieldList += " AS " + generateSafeFieldName(tmpDataElements[i][1]);
				}
			}
			else
			{
				tmpFieldList += generateSafeFieldName(tmpDataElements[i]);
			}
		}
		return tmpFieldList;
	};

	const SURROUNDING_QUOTES_AND_WHITESPACE_REGEX = /^[" ]+|[" ]+$/g;

	const cleanseQuoting = (str) =>
	{
		return str.replace(SURROUNDING_QUOTES_AND_WHITESPACE_REGEX, '');
	};

	/**
	* Ensure a field name is properly escaped with double quotes.
	*/
	var generateSafeFieldName = function(pFieldName)
	{
		let pFieldNames = pFieldName.split('.');
		if (pFieldNames.length > 1)
		{
			const cleansedFieldName = cleanseQuoting(pFieldNames[1]);
			if (cleansedFieldName === '*')
			{
				return '"' + cleanseQuoting(pFieldNames[0]) + '".*';
			}
			return '"' + cleanseQuoting(pFieldNames[0]) + '"."' + cleansedFieldName + '"';
		}
		const cleansedFieldName = cleanseQuoting(pFieldNames[0]);
		if (cleansedFieldName === '*')
		{
			return '*';
		}
		return '"' + cleanseQuoting(pFieldNames[0]) + '"';
	}

	var resolveJsonColumnPath = function(pColumnName, pSchema)
	{
		if (!Array.isArray(pSchema) || pSchema.length < 1) return null;
		var tmpParts = pColumnName.replace(/`/g, '').replace(/"/g, '').split('.');
		for (var tmpStartIdx = 0; tmpStartIdx < Math.min(tmpParts.length - 1, 2); tmpStartIdx++)
		{
			var tmpBaseColumn = tmpParts[tmpStartIdx];
			for (var s = 0; s < pSchema.length; s++)
			{
				if (pSchema[s].Column === tmpBaseColumn &&
					(pSchema[s].Type === 'JSON' || pSchema[s].Type === 'JSONProxy'))
				{
					var tmpActualColumn = (pSchema[s].Type === 'JSONProxy') ? pSchema[s].StorageColumn : tmpBaseColumn;
					var tmpJsonPath = '$.' + tmpParts.slice(tmpStartIdx + 1).join('.');
					return { column: tmpActualColumn, path: tmpJsonPath };
				}
			}
		}
		return null;
	};

	/**
	* Generate a query from the array of where clauses
	*
	* Each clause is an object like:
		{
			Column:'Name',
			Operator:'EQ',
			Value:'John',
			Connector:'And',
			Parameter:'Name'
		}
	*
	* @method: generateWhere
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the WHERE clause prefixed with WHERE, or an empty string if unnecessary
	*/
	var generateWhere = function(pParameters)
	{
		var tmpFilter = Array.isArray(pParameters.filter) ? pParameters.filter : [];
		var tmpTableName = generateTableName(pParameters);

		if (!pParameters.query.disableDeleteTracking)
		{
			// Check if there is a Deleted column on the Schema. If so, we add this to the filters automatically (if not already present)
			var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
			for (var i = 0; i < tmpSchema.length; i++)
			{
				var tmpSchemaEntry = tmpSchema[i];

				if (tmpSchemaEntry.Type === 'Deleted')
				{
					var tmpHasDeletedParameter = false;

					if (tmpFilter.length > 0)
					{
						for (var x = 0; x < tmpFilter.length; x++)
						{
							if (tmpFilter[x].Column === tmpSchemaEntry.Column)
							{
								tmpHasDeletedParameter = true;
								break;
							}
						}
					}
					if (!tmpHasDeletedParameter)
					{
						tmpFilter.push(
						{
							Column: generateSafeFieldName(pParameters.scope + '.' + tmpSchemaEntry.Column),
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

		var tmpWhere = ' WHERE';

		var tmpLastOperatorNoConnector = false;

		for (var i = 0; i < tmpFilter.length; i++)
		{
			if ((tmpFilter[i].Connector != 'NONE') && (tmpFilter[i].Operator != ')') && (tmpWhere != ' WHERE') && (tmpLastOperatorNoConnector == false))
			{
				tmpWhere += ' '+tmpFilter[i].Connector;
			}

			tmpLastOperatorNoConnector = false;

			var tmpColumnParameter;

			if (tmpFilter[i].Operator === '(')
			{
				tmpWhere += ' (';
				tmpLastOperatorNoConnector = true;
			}
			else if (tmpFilter[i].Operator === ')')
			{
				tmpWhere += ' )';
			}
			else if (tmpFilter[i].Operator === 'IN' || tmpFilter[i].Operator === "NOT IN")
			{
				tmpColumnParameter = tmpFilter[i].Parameter+'_w'+i;
				tmpWhere += ' '+generateSafeFieldName(tmpFilter[i].Column)+' '+tmpFilter[i].Operator+' ( :'+tmpColumnParameter+' )';
				pParameters.query.parameters[tmpColumnParameter] = tmpFilter[i].Value;
			}
			else if (tmpFilter[i].Operator === 'IS NULL')
			{
				tmpWhere += ' '+generateSafeFieldName(tmpFilter[i].Column)+' '+tmpFilter[i].Operator;
			}
			else if (tmpFilter[i].Operator === 'IS NOT NULL')
			{
				tmpWhere += ' '+generateSafeFieldName(tmpFilter[i].Column)+' '+tmpFilter[i].Operator;
			}
			else
			{
				tmpColumnParameter = tmpFilter[i].Parameter+'_w'+i;
				var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];
				var tmpJsonRef = resolveJsonColumnPath(tmpFilter[i].Column, tmpSchema);
				if (tmpJsonRef)
				{
					var tmpPathParts = tmpJsonRef.path.replace('$.', '').split('.');
					if (tmpPathParts.length === 1)
					{
						tmpWhere += ' "'+tmpJsonRef.column+'"'+"->>'"+tmpPathParts[0]+"' "+tmpFilter[i].Operator+' :'+tmpColumnParameter;
					}
					else
					{
						tmpWhere += ' "'+tmpJsonRef.column+'"'+"#>>'{"+tmpPathParts.join(',')+"}' "+tmpFilter[i].Operator+' :'+tmpColumnParameter;
					}
				}
				else
				{
					tmpWhere += ' '+generateSafeFieldName(tmpFilter[i].Column)+' '+tmpFilter[i].Operator+' :'+tmpColumnParameter;
				}
				pParameters.query.parameters[tmpColumnParameter] = tmpFilter[i].Value;
			}
		}

		return tmpWhere;
	};

	/**
	* Generate an ORDER BY clause from the sort array
	*
	* Each entry in the sort is an object like:
	* {Column:'Color',Direction:'Descending'}
	*
	* @method: generateOrderBy
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the field list clause
	*/
	var generateOrderBy = function(pParameters)
	{
		var tmpOrderBy = pParameters.sort;
		if (!Array.isArray(tmpOrderBy) || tmpOrderBy.length < 1)
		{
			return '';
		}

		var tmpOrderClause = ' ORDER BY';
		for (var i = 0; i < tmpOrderBy.length; i++)
		{
			if (i > 0)
			{
				tmpOrderClause += ',';
			}
			tmpOrderClause += ' '+generateSafeFieldName(tmpOrderBy[i].Column);

			if (tmpOrderBy[i].Direction == 'Descending')
			{
				tmpOrderClause += ' DESC';
			}
		}
		return tmpOrderClause;
	};

	/**
	* Generate the limit clause using PostgreSQL LIMIT/OFFSET syntax
	*
	* @method: generateLimit
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the table limit clause
	*/
	var generateLimit = function(pParameters)
	{
		if (!pParameters.cap)
		{
			return '';
		}

		var tmpLimit = ' LIMIT ' + pParameters.cap;

		if (pParameters.begin !== false)
		{
			tmpLimit += ' OFFSET ' + pParameters.begin;
		}

		return tmpLimit;
	};

	/**
	* Generate the join clause
	*
	* @method: generateJoins
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the join clause
	*/
	var generateJoins = function(pParameters)
	{
		var tmpJoins = pParameters.join;
		if (!Array.isArray(tmpJoins) || tmpJoins.length < 1)
		{
			return '';
		}

		var tmpJoinClause = '';
		for (var i = 0; i < tmpJoins.length; i++)
		{
			var join = tmpJoins[i];
			if (join.Type && join.Table && join.From && join.To)
			{
				tmpJoinClause += ` ${join.Type} ${join.Table} ON ${join.From} = ${join.To}`;
			}
		}

		return tmpJoinClause;
	}

	/**
	* Generate the update SET clause
	*
	* @method: generateUpdateSetters
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the table name clause
	*/
	var generateUpdateSetters = function(pParameters)
	{
		var tmpRecords = pParameters.query.records;
		if (!Array.isArray(tmpRecords) || tmpRecords.length < 1)
		{
			return false;
		}

		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];

		var tmpUpdate = '';
		var tmpCurrentColumn = 0;
		for(var tmpColumn in tmpRecords[0])
		{
			var tmpSchemaEntry = {Column:tmpColumn, Type:'Default'};
			for (var i = 0; i < tmpSchema.length; i++)
			{
				if (tmpColumn == tmpSchema[i].Column)
				{
					tmpSchemaEntry = tmpSchema[i];
					break;
				}
			}

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
			if (tmpCurrentColumn > 0)
			{
				tmpUpdate += ',';
			}
			switch (tmpSchemaEntry.Type)
			{
				case 'UpdateDate':
					if (pParameters.query.disableAutoDateStamp)
					{
						var tmpColumnParameter = tmpColumn+'_'+tmpCurrentColumn;
						tmpUpdate += ' '+generateSafeFieldName(tmpColumn)+' = :'+tmpColumnParameter;
						pParameters.query.parameters[tmpColumnParameter] = tmpRecords[0][tmpColumn];
					}
					else
					{
						tmpUpdate += ' '+generateSafeFieldName(tmpColumn)+' = ' + SQL_NOW;
					}
					break;
				case 'UpdateIDUser':
					var tmpColumnParameter = tmpColumn+'_'+tmpCurrentColumn;
					tmpUpdate += ' '+generateSafeFieldName(tmpColumn)+' = :'+tmpColumnParameter;
					pParameters.query.parameters[tmpColumnParameter] = pParameters.query.IDUser;
					break;
				case 'JSON':
					var tmpJSONUpdateParam = tmpColumn+'_'+tmpCurrentColumn;
					tmpUpdate += ' '+generateSafeFieldName(tmpColumn)+' = :'+tmpJSONUpdateParam;
					pParameters.query.parameters[tmpJSONUpdateParam] = (typeof tmpRecords[0][tmpColumn] === 'string')
						? tmpRecords[0][tmpColumn]
						: JSON.stringify(tmpRecords[0][tmpColumn] || {});
					break;
				case 'JSONProxy':
					var tmpProxyUpdateParam = tmpSchemaEntry.StorageColumn+'_'+tmpCurrentColumn;
					tmpUpdate += ' '+generateSafeFieldName(tmpSchemaEntry.StorageColumn)+' = :'+tmpProxyUpdateParam;
					pParameters.query.parameters[tmpProxyUpdateParam] = (typeof tmpRecords[0][tmpColumn] === 'string')
						? tmpRecords[0][tmpColumn]
						: JSON.stringify(tmpRecords[0][tmpColumn] || {});
					break;
				default:
					var tmpColumnDefaultParameter = tmpColumn+'_'+tmpCurrentColumn;
					tmpUpdate += ' '+generateSafeFieldName(tmpColumn)+' = :'+tmpColumnDefaultParameter;
					pParameters.query.parameters[tmpColumnDefaultParameter] = tmpRecords[0][tmpColumn];
					break;
			}

			tmpCurrentColumn++;
		}

		if (tmpUpdate === '')
		{
			return false;
		}

		return tmpUpdate;
	};

	/**
	* Generate the update-delete SET clause
	*
	* @method: generateUpdateDeleteSetters
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the table name clause
	*/
	var generateUpdateDeleteSetters = function(pParameters)
	{
		if (pParameters.query.disableDeleteTracking)
		{
			return false;
		}
		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];

		var tmpCurrentColumn = 0;
		var tmpHasDeletedField = false;
		var tmpUpdate = '';
		var tmpSchemaEntry = {Type:'Default'};
		for (var i = 0; i < tmpSchema.length; i++)
		{
			tmpSchemaEntry = tmpSchema[i];

			var tmpUpdateSql = null;

			switch (tmpSchemaEntry.Type)
			{
				case 'Deleted':
					tmpUpdateSql = ' '+generateSafeFieldName(tmpSchemaEntry.Column)+' = 1';
					tmpHasDeletedField = true;
					break;
				case 'DeleteDate':
					tmpUpdateSql = ' '+generateSafeFieldName(tmpSchemaEntry.Column)+' = ' + SQL_NOW;
					break;
				case 'UpdateDate':
					tmpUpdateSql = ' '+generateSafeFieldName(tmpSchemaEntry.Column)+' = ' + SQL_NOW;
					break;
				case 'DeleteIDUser':
					var tmpColumnParameter = tmpSchemaEntry.Column+'_'+tmpCurrentColumn;
					tmpUpdateSql = ' '+generateSafeFieldName(tmpSchemaEntry.Column)+' = :'+tmpColumnParameter;
					pParameters.query.parameters[tmpColumnParameter] = pParameters.query.IDUser;
					break;
				default:
					continue;
			}

			if (tmpCurrentColumn > 0)
			{
				tmpUpdate += ',';
			}

			tmpUpdate += tmpUpdateSql;

			tmpCurrentColumn++;
		}

		if (!tmpHasDeletedField ||
			tmpUpdate === '')
		{
			return false;
		}

		return tmpUpdate;
	};

	/**
	* Generate the update-undelete SET clause
	*
	* @method: generateUpdateUndeleteSetters
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the table name clause
	*/
	var generateUpdateUndeleteSetters = function(pParameters)
	{
		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];

		var tmpCurrentColumn = 0;
		var tmpHasDeletedField = false;
		var tmpUpdate = '';
		var tmpSchemaEntry = {Type:'Default'};
		for (var i = 0; i < tmpSchema.length; i++)
		{
			tmpSchemaEntry = tmpSchema[i];

			var tmpUpdateSql = null;

			switch (tmpSchemaEntry.Type)
			{
				case 'Deleted':
					tmpUpdateSql = ' '+generateSafeFieldName(tmpSchemaEntry.Column)+' = 0';
					tmpHasDeletedField = true;
					break;
				case 'UpdateDate':
					tmpUpdateSql = ' '+generateSafeFieldName(tmpSchemaEntry.Column)+' = ' + SQL_NOW;
					break;
				case 'UpdateIDUser':
					var tmpColumnParameter = tmpSchemaEntry.Column+'_'+tmpCurrentColumn;
					tmpUpdateSql = ' '+generateSafeFieldName(tmpSchemaEntry.Column)+' = :'+tmpColumnParameter;
					pParameters.query.parameters[tmpColumnParameter] = pParameters.query.IDUser;
					break;
				default:
					continue;
			}

			if (tmpCurrentColumn > 0)
			{
				tmpUpdate += ',';
			}

			tmpUpdate += tmpUpdateSql;

			tmpCurrentColumn++;
		}

		if (!tmpHasDeletedField ||
			tmpUpdate === '')
		{
			return false;
		}

		return tmpUpdate;
	};

	/**
	* Generate the create SET clause values
	*
	* @method: generateCreateSetValues
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the table name clause
	*/
	var generateCreateSetValues = function(pParameters)
	{
		var tmpRecords = pParameters.query.records;
		if (!Array.isArray(tmpRecords) || tmpRecords.length < 1)
		{
			return false;
		}

		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];


		var tmpCreateSet = '';
		var tmpCurrentColumn = 0;
		for(var tmpColumn in tmpRecords[0])
		{
			var tmpSchemaEntry = {Column:tmpColumn, Type:'Default'};
			for (var i = 0; i < tmpSchema.length; i++)
			{
				if (tmpColumn == tmpSchema[i].Column)
				{
					tmpSchemaEntry = tmpSchema[i];
					break;
				}
			}

			if (!pParameters.query.disableDeleteTracking)
			{
				if (tmpSchemaEntry.Type === 'DeleteDate' ||
					tmpSchemaEntry.Type === 'DeleteIDUser')
				{
					continue;
				}
			}

			if (tmpCurrentColumn > 0)
			{
				tmpCreateSet += ',';
			}

			var buildDefaultDefinition = function()
			{
				var tmpColumnParameter = tmpColumn+'_'+tmpCurrentColumn;
				tmpCreateSet += ' :'+tmpColumnParameter;
				pParameters.query.parameters[tmpColumnParameter] = tmpRecords[0][tmpColumn];
			};

			var tmpColumnParameter;
			switch (tmpSchemaEntry.Type)
			{
				case 'AutoIdentity':
					if (pParameters.query.disableAutoIdentity)
					{
						buildDefaultDefinition();
					}
					else
					{
						// PostgreSQL SERIAL columns use DEFAULT rather than NULL
						tmpCreateSet += ' DEFAULT';
					}
					break;
				case 'AutoGUID':
					if (pParameters.query.disableAutoIdentity)
					{
						buildDefaultDefinition();
					}
					else if (tmpRecords[0][tmpColumn] &&
							tmpRecords[0][tmpColumn].length >= 5 &&
							tmpRecords[0][tmpColumn] !== '0x0000000000000000') //stricture default
					{
						buildDefaultDefinition();
					}
					else
					{
						tmpColumnParameter = tmpColumn+'_'+tmpCurrentColumn;
						tmpCreateSet += ' :'+tmpColumnParameter;
						pParameters.query.parameters[tmpColumnParameter] = pParameters.query.UUID;
					}
					break;
				case 'UpdateDate':
				case 'CreateDate':
				case 'DeleteDate':
					if (pParameters.query.disableAutoDateStamp)
					{
						buildDefaultDefinition();
					}
					else
					{
						tmpCreateSet += ' ' + SQL_NOW;
					}
					break;
				case 'DeleteIDUser':
				case 'UpdateIDUser':
				case 'CreateIDUser':
					if (pParameters.query.disableAutoUserStamp)
					{
						buildDefaultDefinition();
					}
					else
					{
						tmpColumnParameter = tmpColumn+'_'+tmpCurrentColumn;
						tmpCreateSet += ' :'+tmpColumnParameter;
						pParameters.query.parameters[tmpColumnParameter] = pParameters.query.IDUser;
					}
					break;
				case 'JSON':
					var tmpJSONCreateParam = tmpColumn+'_'+tmpCurrentColumn;
					tmpCreateSet += ' :'+tmpJSONCreateParam;
					pParameters.query.parameters[tmpJSONCreateParam] = (typeof tmpRecords[0][tmpColumn] === 'string')
						? tmpRecords[0][tmpColumn]
						: JSON.stringify(tmpRecords[0][tmpColumn] || {});
					break;
				case 'JSONProxy':
					var tmpProxyCreateParam = tmpColumn+'_'+tmpCurrentColumn;
					tmpCreateSet += ' :'+tmpProxyCreateParam;
					pParameters.query.parameters[tmpProxyCreateParam] = (typeof tmpRecords[0][tmpColumn] === 'string')
						? tmpRecords[0][tmpColumn]
						: JSON.stringify(tmpRecords[0][tmpColumn] || {});
					break;
				default:
					buildDefaultDefinition();
					break;
			}

			tmpCurrentColumn++;
		}

		if (tmpCreateSet === '')
		{
			return false;
		}

		return tmpCreateSet;
	};

	/**
	* Generate the create SET clause column list
	*
	* @method: generateCreateSetList
	* @param: {Object} pParameters SQL Query Parameters
	* @return: {String} Returns the table name clause
	*/
	var generateCreateSetList = function(pParameters)
	{
		var tmpRecords = pParameters.query.records;

		var tmpSchema = Array.isArray(pParameters.query.schema) ? pParameters.query.schema : [];

		var tmpCreateSet = '';
		for(var tmpColumn in tmpRecords[0])
		{
			var tmpSchemaEntry = {Column:tmpColumn, Type:'Default'};
			for (var i = 0; i < tmpSchema.length; i++)
			{
				if (tmpColumn == tmpSchema[i].Column)
				{
					tmpSchemaEntry = tmpSchema[i];
					break;
				}
			}
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
				case 'JSON':
					if (tmpCreateSet != '')
					{
						tmpCreateSet += ',';
					}
					tmpCreateSet += ' '+generateSafeFieldName(tmpColumn);
					break;
				case 'JSONProxy':
					if (tmpCreateSet != '')
					{
						tmpCreateSet += ',';
					}
					tmpCreateSet += ' '+generateSafeFieldName(tmpSchemaEntry.StorageColumn);
					break;
				default:
					if (tmpCreateSet != '')
					{
						tmpCreateSet += ',';
					}
					tmpCreateSet += ' '+generateSafeFieldName(tmpColumn);
					break;
			}
		}

		return tmpCreateSet;
	};


	var Create = function(pParameters)
	{
		var tmpTableName = generateTableName(pParameters);
		var tmpCreateSetList = generateCreateSetList(pParameters);
		var tmpCreateSetValues = generateCreateSetValues(pParameters);

		if (!tmpCreateSetValues)
		{
			return false;
		}

		return 'INSERT INTO'+tmpTableName+' ('+tmpCreateSetList+') VALUES ('+tmpCreateSetValues+') RETURNING *;';
	};


	/**
	* Read one or many records
	*
	* @method Read
	* @param {Object} pParameters SQL Query parameters
	* @return {String} Returns the current Query for chaining.
	*/
	var Read = function(pParameters)
	{
		var tmpFieldList = generateFieldList(pParameters);
		var tmpTableName = generateTableName(pParameters);
		var tmpWhere = generateWhere(pParameters);
		var tmpJoin = generateJoins(pParameters);
		var tmpOrderBy = generateOrderBy(pParameters);
		var tmpLimit = generateLimit(pParameters);
		const tmpOptDistinct = pParameters.distinct ? ' DISTINCT' : '';

		if (pParameters.queryOverride)
		{
			try
			{
				var tmpQueryTemplate = _Fable.Utility.template(pParameters.queryOverride);
				return tmpQueryTemplate({FieldList:tmpFieldList, TableName:tmpTableName, Where:tmpWhere, Join:tmpJoin, OrderBy:tmpOrderBy, Limit:tmpLimit, Distinct: tmpOptDistinct, _Params: pParameters});
			}
			catch (pError)
			{
				console.log('Error with custom Read Query ['+pParameters.queryOverride+']: '+pError);
				return false;
			}
		}

		return `SELECT${tmpOptDistinct}${tmpFieldList} FROM${tmpTableName}${tmpJoin}${tmpWhere}${tmpOrderBy}${tmpLimit};`;
	};

	var Update = function(pParameters)
	{
		var tmpTableName = generateTableName(pParameters);
		var tmpWhere = generateWhere(pParameters);
		var tmpUpdateSetters = generateUpdateSetters(pParameters);

		if (!tmpUpdateSetters)
		{
			return false;
		}

		return 'UPDATE'+tmpTableName+' SET'+tmpUpdateSetters+tmpWhere+';';
	};

	var Delete = function(pParameters)
	{
		var tmpTableName = generateTableName(pParameters);
		var tmpWhere = generateWhere(pParameters);
		var tmpUpdateDeleteSetters = generateUpdateDeleteSetters(pParameters);

		if (tmpUpdateDeleteSetters)
		{
			return 'UPDATE'+tmpTableName+' SET'+tmpUpdateDeleteSetters+tmpWhere+';';
		}
		else
		{
			return 'DELETE FROM'+tmpTableName+tmpWhere+';';
		}
	};

	var Undelete = function(pParameters)
	{
		var tmpTableName = generateTableName(pParameters);
		let tmpDeleteTrackingState = pParameters.query.disableDeleteTracking;
		pParameters.query.disableDeleteTracking = true;
		var tmpWhere = generateWhere(pParameters);
		var tmpUpdateUndeleteSetters = generateUpdateUndeleteSetters(pParameters);
		pParameters.query.disableDeleteTracking = tmpDeleteTrackingState;

		if (tmpUpdateUndeleteSetters)
		{
			return 'UPDATE'+tmpTableName+' SET'+tmpUpdateUndeleteSetters+tmpWhere+';';
		}
		else
		{
			return 'SELECT NULL;';
		}
	};

	var Count = function(pParameters)
	{
		var tmpFieldList = pParameters.distinct ? generateFieldList(pParameters, true) : '*';
		var tmpTableName = generateTableName(pParameters);
		var tmpJoin = generateJoins(pParameters);
		var tmpWhere = generateWhere(pParameters);
		if (pParameters.distinct && tmpFieldList.length < 1)
		{
			console.warn('Distinct requested but no field list or schema are available, so not honoring distinct for count query.');
		}
		const tmpOptDistinct = pParameters.distinct && tmpFieldList.length > 0 ? 'DISTINCT' : '';

		if (pParameters.queryOverride)
		{
			try
			{
				var tmpQueryTemplate = _Fable.Utility.template(pParameters.queryOverride);
				return tmpQueryTemplate({FieldList:[], TableName:tmpTableName, Where:tmpWhere, OrderBy:'', Limit:'', Distinct: tmpOptDistinct, _Params: pParameters});
			}
			catch (pError)
			{
				console.log('Error with custom Count Query ['+pParameters.queryOverride+']: '+pError);
				return false;
			}
		}

		return `SELECT COUNT(${tmpOptDistinct}${tmpFieldList || '*'}) AS RowCount FROM${tmpTableName}${tmpJoin}${tmpWhere};`;
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
			get: function() { return 'PostgreSQL'; },
			enumerable: true
		});

	return tmpDialect;
};

module.exports = FoxHoundDialectPostgreSQL;
