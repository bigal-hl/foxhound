/**
* FoxHound MongoDB Dialect
*
* Generates JSON operation descriptors for MongoDB queries.
* The query body is a JSON string; the parsed operation object is also
* stored in query.parameters.mongoOperation for direct provider consumption.
*
* @license MIT
*
* @author Steven Velozo <steven@velozo.com>
* @class FoxHoundDialectMongoDB
*/

var FoxHoundDialectMongoDB = function(pFable)
{
	let _Fable = pFable;

	/**
	* Strip any table-name prefix from a column name.
	* MongoDB has no table-qualified field names.
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
			// If it ends with *, just ignore it (wildcard in MongoDB = all fields)
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
	* Translate a single FoxHound filter operator into a MongoDB condition object.
	*
	* @method translateOperator
	* @param {Object} pFilterEntry A FoxHound filter object
	* @return {Object} MongoDB condition object
	*/
	var translateOperator = function(pFilterEntry)
	{
		var tmpColumn = stripTablePrefix(pFilterEntry.Column);
		var tmpValue = pFilterEntry.Value;

		switch (pFilterEntry.Operator)
		{
			case '=':
				var tmpObj = {};
				tmpObj[tmpColumn] = tmpValue;
				return tmpObj;
			case '!=':
				var tmpNeObj = {};
				tmpNeObj[tmpColumn] = { $ne: tmpValue };
				return tmpNeObj;
			case '>':
				var tmpGtObj = {};
				tmpGtObj[tmpColumn] = { $gt: tmpValue };
				return tmpGtObj;
			case '>=':
				var tmpGteObj = {};
				tmpGteObj[tmpColumn] = { $gte: tmpValue };
				return tmpGteObj;
			case '<':
				var tmpLtObj = {};
				tmpLtObj[tmpColumn] = { $lt: tmpValue };
				return tmpLtObj;
			case '<=':
				var tmpLteObj = {};
				tmpLteObj[tmpColumn] = { $lte: tmpValue };
				return tmpLteObj;
			case 'LIKE':
				// Convert SQL LIKE pattern to regex: % -> .*, _ -> .
				var tmpPattern = String(tmpValue).replace(/%/g, '.*').replace(/_/g, '.');
				var tmpLikeObj = {};
				tmpLikeObj[tmpColumn] = { $regex: tmpPattern, $options: 'i' };
				return tmpLikeObj;
			case 'IN':
				var tmpInObj = {};
				tmpInObj[tmpColumn] = { $in: Array.isArray(tmpValue) ? tmpValue : [tmpValue] };
				return tmpInObj;
			case 'NOT IN':
				var tmpNinObj = {};
				tmpNinObj[tmpColumn] = { $nin: Array.isArray(tmpValue) ? tmpValue : [tmpValue] };
				return tmpNinObj;
			case 'IS NULL':
				var tmpNullObj = {};
				tmpNullObj[tmpColumn] = null;
				return tmpNullObj;
			case 'IS NOT NULL':
				var tmpNotNullObj = {};
				tmpNotNullObj[tmpColumn] = { $ne: null };
				return tmpNotNullObj;
			default:
				// Unknown operator, treat as equality
				var tmpDefaultObj = {};
				tmpDefaultObj[tmpColumn] = tmpValue;
				return tmpDefaultObj;
		}
	};

	/**
	* Safely merge an array of condition objects into a single MongoDB filter.
	* If there are key collisions, wrap in $and.
	*
	* @method mergeConditions
	* @param {Array} pConditions Array of condition objects
	* @return {Object} Merged MongoDB filter
	*/
	var mergeConditions = function(pConditions)
	{
		if (!pConditions || pConditions.length === 0)
		{
			return {};
		}

		if (pConditions.length === 1)
		{
			var tmpSingle = pConditions[0];
			delete tmpSingle._connector;
			return tmpSingle;
		}

		// Check for key collisions
		var tmpKeysSeen = {};
		var tmpHasCollision = false;
		for (var i = 0; i < pConditions.length; i++)
		{
			var tmpKeys = Object.keys(pConditions[i]);
			for (var j = 0; j < tmpKeys.length; j++)
			{
				var tmpKey = tmpKeys[j];
				if (tmpKey === '_connector') continue;
				if (tmpKey.charAt(0) === '$') { tmpHasCollision = true; break; }
				if (tmpKeysSeen[tmpKey]) { tmpHasCollision = true; break; }
				tmpKeysSeen[tmpKey] = true;
			}
			if (tmpHasCollision) break;
		}

		if (tmpHasCollision)
		{
			// Must use $and
			var tmpAndArray = [];
			for (var k = 0; k < pConditions.length; k++)
			{
				var tmpCond = pConditions[k];
				delete tmpCond._connector;
				tmpAndArray.push(tmpCond);
			}
			return { $and: tmpAndArray };
		}
		else
		{
			// Safe to merge into a single object
			var tmpMerged = {};
			for (var m = 0; m < pConditions.length; m++)
			{
				var tmpCondM = pConditions[m];
				var tmpKeysM = Object.keys(tmpCondM);
				for (var n = 0; n < tmpKeysM.length; n++)
				{
					if (tmpKeysM[n] !== '_connector')
					{
						tmpMerged[tmpKeysM[n]] = tmpCondM[tmpKeysM[n]];
					}
				}
			}
			return tmpMerged;
		}
	};

	/**
	* Generate the MongoDB filter object from the FoxHound filter array.
	* Uses a stack-based approach for parenthetical groups.
	*
	* @method generateFilter
	* @param {Object} pParameters SQL Query Parameters
	* @return {Object} MongoDB filter object
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
			return {};
		}

		// Stack-based processing for parenthetical groups
		var tmpStack = [[]]; // Stack of condition arrays

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
					if (tmpGroupConditions[g]._connector === 'OR')
					{
						tmpHasOR = true;
						break;
					}
				}

				var tmpWrapped;
				if (tmpHasOR)
				{
					var tmpOrArray = [];
					for (var g2 = 0; g2 < tmpGroupConditions.length; g2++)
					{
						delete tmpGroupConditions[g2]._connector;
						tmpOrArray.push(tmpGroupConditions[g2]);
					}
					tmpWrapped = { $or: tmpOrArray };
				}
				else
				{
					tmpWrapped = mergeConditions(tmpGroupConditions);
				}

				tmpWrapped._connector = tmpEntry.Connector || 'AND';
				tmpStack[tmpStack.length - 1].push(tmpWrapped);
			}
			else
			{
				var tmpCondition = translateOperator(tmpEntry);
				tmpCondition._connector = tmpEntry.Connector || 'AND';
				tmpStack[tmpStack.length - 1].push(tmpCondition);
			}
		}

		// Collapse root level
		var tmpRootConditions = tmpStack[0];
		return mergeConditions(tmpRootConditions);
	};

	/**
	* Generate the MongoDB projection object from dataElements.
	*
	* @method generateProjection
	* @param {Object} pParameters SQL Query Parameters
	* @return {Object} MongoDB projection object (empty = all fields)
	*/
	var generateProjection = function(pParameters)
	{
		var tmpDataElements = pParameters.dataElements;
		if (!Array.isArray(tmpDataElements) || tmpDataElements.length < 1)
		{
			return {};
		}

		var tmpProjection = {};
		for (var i = 0; i < tmpDataElements.length; i++)
		{
			var tmpField = tmpDataElements[i];
			// Handle array format [FieldName, Alias]
			if (Array.isArray(tmpField))
			{
				tmpField = tmpField[0];
			}
			tmpField = stripTablePrefix(tmpField);
			if (tmpField !== '*')
			{
				tmpProjection[tmpField] = 1;
			}
		}
		return tmpProjection;
	};

	/**
	* Generate the MongoDB sort object from sort array.
	*
	* @method generateSort
	* @param {Object} pParameters SQL Query Parameters
	* @return {Object} MongoDB sort object (empty = no sort)
	*/
	var generateSort = function(pParameters)
	{
		var tmpSort = pParameters.sort;
		if (!Array.isArray(tmpSort) || tmpSort.length < 1)
		{
			return {};
		}

		var tmpSortObj = {};
		for (var i = 0; i < tmpSort.length; i++)
		{
			var tmpColumn = stripTablePrefix(tmpSort[i].Column);
			tmpSortObj[tmpColumn] = (tmpSort[i].Direction === 'Descending') ? -1 : 1;
		}
		return tmpSortObj;
	};

	/**
	* Generate the document for a create (insertOne) operation.
	* Walks the record through the schema to handle special column types.
	*
	* @method generateCreateDocument
	* @param {Object} pParameters SQL Query Parameters
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
	* Generate the $set document for an update operation.
	* Walks the record through the schema, skipping identity/create/delete columns.
	*
	* @method generateUpdateDocument
	* @param {Object} pParameters SQL Query Parameters
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

			if (pParameters.query.disableAutoDateStamp &&
				tmpSchemaEntry.Type === 'UpdateDate')
			{
				continue;
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

			switch (tmpSchemaEntry.Type)
			{
				case 'UpdateDate':
					tmpUpdateDoc[tmpColumn] = '$$NOW';
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
	* Generate the soft-delete $set document.
	* Returns false if no Deleted column exists or delete tracking is disabled.
	*
	* @method generateDeleteSetters
	* @param {Object} pParameters SQL Query Parameters
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
	* Generate the undelete $set document.
	* Returns false if no Deleted column exists.
	*
	* @method generateUndeleteSetters
	* @param {Object} pParameters SQL Query Parameters
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

		var tmpResult = {
			collection: pParameters.scope,
			operation: 'insertOne',
			document: tmpDocument
		};

		pParameters.query.parameters.mongoOperation = tmpResult;

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
			_Fable.log.warn('MongoDB dialect does not support JOINs; join parameter will be ignored.');
		}

		var tmpFilter = generateFilter(pParameters);
		var tmpProjection = generateProjection(pParameters);
		var tmpSort = generateSort(pParameters);

		var tmpResult = {
			collection: pParameters.scope,
			operation: 'find',
			filter: tmpFilter
		};

		if (Object.keys(tmpProjection).length > 0)
		{
			tmpResult.projection = tmpProjection;
		}

		if (Object.keys(tmpSort).length > 0)
		{
			tmpResult.sort = tmpSort;
		}

		if (pParameters.cap)
		{
			tmpResult.limit = pParameters.cap;
		}

		if (pParameters.begin !== false && pParameters.begin > 0)
		{
			tmpResult.skip = pParameters.begin;
		}

		if (pParameters.distinct)
		{
			tmpResult.distinct = true;
		}

		pParameters.query.parameters.mongoOperation = tmpResult;

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
		var tmpFilter = generateFilter(pParameters);
		var tmpUpdateDoc = generateUpdateDocument(pParameters);

		if (!tmpUpdateDoc)
		{
			return false;
		}

		var tmpResult = {
			collection: pParameters.scope,
			operation: 'updateMany',
			filter: tmpFilter,
			update: { $set: tmpUpdateDoc }
		};

		pParameters.query.parameters.mongoOperation = tmpResult;

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
		var tmpFilter = generateFilter(pParameters);

		if (tmpDeleteSetters)
		{
			// Soft delete via update
			var tmpResult = {
				collection: pParameters.scope,
				operation: 'updateMany',
				filter: tmpFilter,
				update: { $set: tmpDeleteSetters }
			};
			pParameters.query.parameters.mongoOperation = tmpResult;
			return JSON.stringify(tmpResult);
		}
		else
		{
			// Hard delete
			var tmpHardResult = {
				collection: pParameters.scope,
				operation: 'deleteMany',
				filter: tmpFilter
			};
			pParameters.query.parameters.mongoOperation = tmpHardResult;
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
		var tmpFilter = generateFilter(pParameters);
		pParameters.query.disableDeleteTracking = tmpDeleteTrackingState;

		if (tmpUndeleteSetters)
		{
			var tmpResult = {
				collection: pParameters.scope,
				operation: 'updateMany',
				filter: tmpFilter,
				update: { $set: tmpUndeleteSetters }
			};
			pParameters.query.parameters.mongoOperation = tmpResult;
			return JSON.stringify(tmpResult);
		}
		else
		{
			// No-op -- can't undelete without a Deleted column
			var tmpNoopResult = {
				collection: pParameters.scope,
				operation: 'noop'
			};
			pParameters.query.parameters.mongoOperation = tmpNoopResult;
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
		var tmpFilter = generateFilter(pParameters);

		var tmpResult = {
			collection: pParameters.scope,
			operation: 'countDocuments',
			filter: tmpFilter
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

		pParameters.query.parameters.mongoOperation = tmpResult;

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
			get: function() { return 'MongoDB'; },
			enumerable: true
		});

	return tmpDialect;
};

module.exports = FoxHoundDialectMongoDB;
