/**
* Unit tests for FoxHound MongoDB Dialect
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

var Chai = require('chai');
var Expect = Chai.expect;
var Assert = Chai.assert;

var libFable = require('fable');
const _Fable = new libFable({Product:'FoxhoundTestsMongoDB'});
var libFoxHound = require('../source/FoxHound.js');

var _AnimalSchema = (
[
	{ Column: "IDAnimal",        Type:"AutoIdentity" },
	{ Column: "GUIDAnimal",      Type:"AutoGUID" },
	{ Column: "CreateDate",      Type:"CreateDate" },
	{ Column: "CreatingIDUser",  Type:"CreateIDUser" },
	{ Column: "UpdateDate",        Type:"UpdateDate" },
	{ Column: "UpdatingIDUser", Type:"UpdateIDUser" },
	{ Column: "Deleted",         Type:"Deleted" },
	{ Column: "DeletingIDUser",  Type:"DeleteIDUser" },
	{ Column: "DeleteDate",      Type:"DeleteDate" }
]);

var _AnimalSchemaWithoutDeleted = (
[
	{ Column: "IDAnimal",        Type:"AutoIdentity" },
	{ Column: "GUIDAnimal",      Type:"AutoGUID" },
	{ Column: "CreateDate",      Type:"CreateDate" },
	{ Column: "CreatingIDUser",  Type:"CreateIDUser" },
	{ Column: "UpdateDate",        Type:"UpdateDate" },
	{ Column: "UpdatingIDUser", Type:"UpdateIDUser" }
]);

suite
(
	'FoxHound-Dialect-MongoDB',
	function()
	{
		setup
		(
			function()
			{
			}
		);

		suite
		(
			'Object Sanity',
			function()
			{
				test
				(
					'initialize should build a happy little object',
					function()
					{
						var testFoxHound = libFoxHound.new(_Fable).setDialect('MongoDB');
						Expect(testFoxHound.dialect.name)
							.to.equal('MongoDB');
						Expect(testFoxHound)
							.to.be.an('object', 'FoxHound with MongoDB should initialize as an object directly from the require statement.');
					}
				);
			}
		);

		suite
		(
			'Basic Query Generation',
			function()
			{
				test
				(
					'Create Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addRecord({IDAnimal:null, Name:'Foo Foo', Age:15});
						tmpQuery.buildCreateQuery();
						_Fable.log.trace('Create Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.collection).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('insertOne');
						Expect(tmpOp.document.Name).to.equal('Foo Foo');
						Expect(tmpOp.document.Age).to.equal(15);
					}
				);
				test
				(
					'Create Query with Schema uses $$AUTOINCREMENT for AutoIdentity',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addRecord({IDAnimal:null, GUIDAnimal:false, CreateDate:null, CreatingIDUser:null, UpdateDate:null, UpdatingIDUser:null, Deleted:0, Name:'Foo Foo', Age:15});
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.IDUser = 37;
						tmpQuery.query.UUID = 'test-guid-value';
						tmpQuery.buildCreateQuery();
						_Fable.log.trace('Create Query with Schema', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.document.IDAnimal).to.equal('$$AUTOINCREMENT');
						Expect(tmpOp.document.GUIDAnimal).to.equal('test-guid-value');
						Expect(tmpOp.document.CreateDate).to.equal('$$NOW');
						Expect(tmpOp.document.CreatingIDUser).to.equal(37);
						Expect(tmpOp.document.UpdateDate).to.equal('$$NOW');
						Expect(tmpOp.document.UpdatingIDUser).to.equal(37);
						Expect(tmpOp.document.Deleted).to.equal(0);
						// DeleteDate and DeletingIDUser should be skipped
						Expect(tmpOp.document).to.not.have.property('DeleteDate');
						Expect(tmpOp.document).to.not.have.property('DeletingIDUser');
						Expect(tmpOp.document.Name).to.equal('Foo Foo');
					}
				);
				test
				(
					'Create Query with existing GUID passes it through',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addRecord({IDAnimal:null, GUIDAnimal:'my-custom-guid-value'});
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.UUID = 'should-not-use-this';
						tmpQuery.buildCreateQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.document.GUIDAnimal).to.equal('my-custom-guid-value');
					}
				);
				test
				(
					'Bad Create Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable).setDialect('MongoDB');
						tmpQuery.buildCreateQuery();
						tmpQuery.addRecord({});
						tmpQuery.buildCreateQuery();
						_Fable.log.trace('Create Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal(false);
					}
				);
				test
				(
					'Read Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable).setDialect('MongoDB').setScope('Animal');
						tmpQuery.addSort({Column:'Cost',Direction:'Descending'});
						tmpQuery.buildReadQuery();
						_Fable.log.trace('Simple Select Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.collection).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('find');
						Expect(tmpOp.filter).to.deep.equal({});
						Expect(tmpOp.sort.Cost).to.equal(-1);
					}
				);
				test
				(
					'Read Query with Distinct',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable).setDialect('MongoDB').setScope('Animal');
						tmpQuery.addSort({Column:'Cost',Direction:'Descending'})
							.setDistinct(true);
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.distinct).to.equal(true);
					}
				);
				test
				(
					'Complex Read Query with cap, begin, dataElements, sort, filter',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.setCap(10)
							.setBegin(5)
							.setDataElements(['Name', 'Age', 'Cost'])
							.setSort([{Column:'Age',Direction:'Ascending'}])
							.setFilter({Column:'Age',Operator:'=',Value:'15',Connector:'AND',Parameter:'Age'});
						tmpQuery.addSort('Cost');
						tmpQuery.buildReadQuery();
						_Fable.log.trace('Select Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filter.Age).to.equal('15');
						Expect(tmpOp.projection.Name).to.equal(1);
						Expect(tmpOp.projection.Age).to.equal(1);
						Expect(tmpOp.projection.Cost).to.equal(1);
						Expect(tmpOp.sort.Age).to.equal(1);
						Expect(tmpOp.sort.Cost).to.equal(1);
						Expect(tmpOp.limit).to.equal(10);
						Expect(tmpOp.skip).to.equal(5);
					}
				);
				test
				(
					'Complex Read Query with Filters including OR, IN, IS NOT NULL',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.setDataElements(['Name', 'Age', 'Cost'])
							.setCap(100)
							.addFilter('Age', '25')
							.addFilter('', '', '(')
							.addFilter('Color', 'Red')
							.addFilter('Color', 'Green', '=', 'OR')
							.addFilter('', '', ')')
							.addFilter('Description', '', 'IS NOT NULL')
							.addFilter('IDOffice', [10, 11, 15, 18, 22], 'IN');
						tmpQuery.buildReadQuery();
						_Fable.log.trace('Select Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						// Should have $and at top level due to complexity
						Expect(tmpOp.filter).to.have.property('$and');
						var tmpAndArray = tmpOp.filter.$and;
						// Find the $or group
						var tmpOrGroup = tmpAndArray.find(function(c) { return c.hasOwnProperty('$or'); });
						Expect(tmpOrGroup).to.exist;
						Expect(tmpOrGroup.$or).to.have.length(2);
						Expect(tmpOrGroup.$or[0].Color).to.equal('Red');
						Expect(tmpOrGroup.$or[1].Color).to.equal('Green');
						// Find IS NOT NULL
						var tmpNotNull = tmpAndArray.find(function(c) { return c.Description && c.Description.$ne === null; });
						Expect(tmpNotNull).to.exist;
						// Find IN
						var tmpIn = tmpAndArray.find(function(c) { return c.IDOffice && c.IDOffice.$in; });
						Expect(tmpIn).to.exist;
						Expect(tmpIn.IDOffice.$in).to.deep.equal([10, 11, 15, 18, 22]);
					}
				);
				test
				(
					'Read Query with Deleted schema auto-adds Deleted filter',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('Age', '3');
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						// Filter should include both Age and Deleted
						Expect(JSON.stringify(tmpOp.filter)).to.contain('"Deleted"');
					}
				);
				test
				(
					'Read Query with Deleted tracking disabled does NOT add Deleted filter',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('Age', '3');
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.disableDeleteTracking = true;
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(JSON.stringify(tmpOp.filter)).to.not.contain('"Deleted"');
					}
				);
				test
				(
					'Read Query without limit has no skip or limit',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp).to.not.have.property('limit');
						Expect(tmpOp).to.not.have.property('skip');
					}
				);
				test
				(
					'Update Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('IDAnimal', 9)
							.addRecord({Name:'Froggy', Age:12});
						tmpQuery.buildUpdateQuery();
						_Fable.log.trace('Update Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.collection).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('updateMany');
						Expect(tmpOp.filter.IDAnimal).to.equal(9);
						Expect(tmpOp.update.$set.Name).to.equal('Froggy');
						Expect(tmpOp.update.$set.Age).to.equal(12);
					}
				);
				test
				(
					'Update Query with Schema skips identity and create columns',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('IDAnimal', 9)
							.addRecord({IDAnimal:9, CreateDate:'2020-01-01', CreatingIDUser:1, UpdateDate:null, UpdatingIDUser:null, Name:'Froggy', Age:12});
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.IDUser = 37;
						tmpQuery.buildUpdateQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.update.$set).to.not.have.property('IDAnimal');
						Expect(tmpOp.update.$set).to.not.have.property('CreateDate');
						Expect(tmpOp.update.$set).to.not.have.property('CreatingIDUser');
						Expect(tmpOp.update.$set.UpdateDate).to.equal('$$NOW');
						Expect(tmpOp.update.$set.UpdatingIDUser).to.equal(37);
						Expect(tmpOp.update.$set.Name).to.equal('Froggy');
					}
				);
				test
				(
					'Count Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('Age', '3');
						tmpQuery.buildCountQuery();
						_Fable.log.trace('Count Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.collection).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('countDocuments');
						Expect(tmpOp.filter.Age).to.equal('3');
					}
				);
				test
				(
					'Delete Query with soft delete schema',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.IDUser = 37;
						tmpQuery.buildDeleteQuery();
						_Fable.log.trace('Delete Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('updateMany');
						Expect(tmpOp.update.$set.Deleted).to.equal(1);
						Expect(tmpOp.update.$set.DeleteDate).to.equal('$$NOW');
						Expect(tmpOp.update.$set.DeletingIDUser).to.equal(37);
					}
				);
				test
				(
					'Delete Query without schema does hard delete',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.buildDeleteQuery();
						_Fable.log.trace('Delete Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('deleteMany');
						Expect(tmpOp.filter.IDAnimal).to.equal(9);
					}
				);
				test
				(
					'Undelete Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.IDUser = 37;
						tmpQuery.buildUndeleteQuery();
						_Fable.log.trace('Undelete Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('updateMany');
						Expect(tmpOp.update.$set.Deleted).to.equal(0);
						Expect(tmpOp.update.$set.UpdateDate).to.equal('$$NOW');
						Expect(tmpOp.update.$set.UpdatingIDUser).to.equal(37);
					}
				);
				test
				(
					'Undelete Query without Deleted column returns noop',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.query.schema = _AnimalSchemaWithoutDeleted;
						tmpQuery.buildUndeleteQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('noop');
					}
				);
				test
				(
					'mongoOperation is stored in query.parameters',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal');
						tmpQuery.buildReadQuery();
						Expect(tmpQuery.query.parameters.mongoOperation).to.be.an('object');
						Expect(tmpQuery.query.parameters.mongoOperation.collection).to.equal('Animal');
						Expect(tmpQuery.query.parameters.mongoOperation.operation).to.equal('find');
					}
				);
				test
				(
					'Filter with comparison operators',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('Age', 10, '>')
							.addFilter('Cost', 100, '<=');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filter.Age.$gt).to.equal(10);
						Expect(tmpOp.filter.Cost.$lte).to.equal(100);
					}
				);
				test
				(
					'Filter with LIKE operator converts to regex',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('Name', '%Foo%', 'LIKE');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filter.Name.$regex).to.equal('.*Foo.*');
						Expect(tmpOp.filter.Name.$options).to.equal('i');
					}
				);
				test
				(
					'Filter with IS NULL',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('MongoDB')
							.setScope('Animal')
							.addFilter('Description', '', 'IS NULL');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filter.Description).to.equal(null);
					}
				);
			}
		);
	}
);
