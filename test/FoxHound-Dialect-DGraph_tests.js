/**
* Unit tests for FoxHound DGraph Dialect
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

var Chai = require('chai');
var Expect = Chai.expect;
var Assert = Chai.assert;

var libFable = require('fable');
const _Fable = new libFable({Product:'FoxhoundTestsDGraph'});
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
	'FoxHound-Dialect-DGraph',
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
						var testFoxHound = libFoxHound.new(_Fable).setDialect('DGraph');
						Expect(testFoxHound.dialect.name)
							.to.equal('DGraph');
						Expect(testFoxHound)
							.to.be.an('object', 'FoxHound with DGraph should initialize as an object directly from the require statement.');
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
							.setDialect('DGraph')
							.setScope('Animal')
							.addRecord({IDAnimal:null, Name:'Foo Foo', Age:15});
						tmpQuery.buildCreateQuery();
						_Fable.log.trace('Create Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.type).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('mutate');
						Expect(tmpOp.mutationType).to.equal('set');
						Expect(tmpOp.document.Name).to.equal('Foo Foo');
						Expect(tmpOp.document.Age).to.equal(15);
						Expect(tmpOp.document['dgraph.type']).to.equal('Animal');
					}
				);
				test
				(
					'Create Query with Schema uses $$AUTOINCREMENT for AutoIdentity',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
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
						// dgraph.type should be set
						Expect(tmpOp.document['dgraph.type']).to.equal('Animal');
						// counterScope should be present
						Expect(tmpOp.counterScope).to.equal('Animal.IDAnimal');
					}
				);
				test
				(
					'Create Query with existing GUID passes it through',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
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
						var tmpQuery = libFoxHound.new(_Fable).setDialect('DGraph');
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
						var tmpQuery = libFoxHound.new(_Fable).setDialect('DGraph').setScope('Animal');
						tmpQuery.buildReadQuery();
						_Fable.log.trace('Simple Select Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.type).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('query');
						Expect(tmpOp.queryName).to.equal('results');
						Expect(tmpOp.query).to.contain('func: type(Animal)');
						Expect(tmpOp.query).to.contain('uid');
					}
				);
				test
				(
					'Read Query with Sort',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable).setDialect('DGraph').setScope('Animal');
						tmpQuery.addSort({Column:'Cost',Direction:'Descending'});
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.query).to.contain('orderdesc: Cost');
					}
				);
				test
				(
					'Read Query with Distinct',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable).setDialect('DGraph').setScope('Animal');
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
							.setDialect('DGraph')
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
						Expect(tmpOp.query).to.contain('first: 10');
						Expect(tmpOp.query).to.contain('offset: 5');
						Expect(tmpOp.query).to.contain('orderasc: Age');
						Expect(tmpOp.query).to.contain('orderasc: Cost');
						Expect(tmpOp.query).to.contain('@filter(eq(Age, "15"))');
						Expect(tmpOp.query).to.contain('Name');
						Expect(tmpOp.query).to.contain('Age');
						Expect(tmpOp.query).to.contain('Cost');
					}
				);
				test
				(
					'Complex Read Query with Filters including OR, IN, IS NOT NULL',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
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
						// Should have the filter clause
						Expect(tmpOp.query).to.contain('@filter(');
						Expect(tmpOp.query).to.contain('eq(Age, "25")');
						// OR group
						Expect(tmpOp.query).to.contain('(eq(Color, "Red") OR eq(Color, "Green"))');
						// IS NOT NULL
						Expect(tmpOp.query).to.contain('has(Description)');
						// IN
						Expect(tmpOp.query).to.contain('eq(IDOffice, [10, 11, 15, 18, 22])');
					}
				);
				test
				(
					'Read Query with Deleted schema auto-adds Deleted filter',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('Age', '3');
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.query).to.contain('eq(Deleted, 0)');
					}
				);
				test
				(
					'Read Query with Deleted tracking disabled does NOT add Deleted filter',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('Age', '3');
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.disableDeleteTracking = true;
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						// Deleted may appear as a field name but should NOT appear in the filter
						Expect(tmpOp.query).to.not.contain('eq(Deleted');
					}
				);
				test
				(
					'Read Query without limit has no pagination',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.query).to.not.contain('first:');
						Expect(tmpOp.query).to.not.contain('offset:');
					}
				);
				test
				(
					'Update Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('IDAnimal', 9)
							.addRecord({Name:'Froggy', Age:12});
						tmpQuery.buildUpdateQuery();
						_Fable.log.trace('Update Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.type).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('upsert');
						Expect(tmpOp.queryName).to.equal('updateTargets');
						Expect(tmpOp.queryForUIDs).to.contain('func: type(Animal)');
						Expect(tmpOp.queryForUIDs).to.contain('@filter(eq(IDAnimal, 9))');
						Expect(tmpOp.update.Name).to.equal('Froggy');
						Expect(tmpOp.update.Age).to.equal(12);
					}
				);
				test
				(
					'Update Query with Schema skips identity and create columns',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('IDAnimal', 9)
							.addRecord({IDAnimal:9, CreateDate:'2020-01-01', CreatingIDUser:1, UpdateDate:null, UpdatingIDUser:null, Name:'Froggy', Age:12});
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.IDUser = 37;
						tmpQuery.buildUpdateQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.update).to.not.have.property('IDAnimal');
						Expect(tmpOp.update).to.not.have.property('CreateDate');
						Expect(tmpOp.update).to.not.have.property('CreatingIDUser');
						Expect(tmpOp.update.UpdateDate).to.equal('$$NOW');
						Expect(tmpOp.update.UpdatingIDUser).to.equal(37);
						Expect(tmpOp.update.Name).to.equal('Froggy');
					}
				);
				test
				(
					'Count Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('Age', '3');
						tmpQuery.buildCountQuery();
						_Fable.log.trace('Count Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.type).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('query');
						Expect(tmpOp.isCount).to.equal(true);
						Expect(tmpOp.query).to.contain('count(uid)');
						Expect(tmpOp.query).to.contain('eq(Age, "3")');
					}
				);
				test
				(
					'Delete Query with soft delete schema',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.IDUser = 37;
						tmpQuery.buildDeleteQuery();
						_Fable.log.trace('Delete Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('upsert');
						Expect(tmpOp.queryName).to.equal('deleteTargets');
						Expect(tmpOp.queryForUIDs).to.contain('eq(IDAnimal, 9)');
						Expect(tmpOp.queryForUIDs).to.contain('eq(Deleted, 0)');
						Expect(tmpOp.update.Deleted).to.equal(1);
						Expect(tmpOp.update.DeleteDate).to.equal('$$NOW');
						Expect(tmpOp.update.DeletingIDUser).to.equal(37);
					}
				);
				test
				(
					'Delete Query without schema does hard delete',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.buildDeleteQuery();
						_Fable.log.trace('Delete Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('delete');
						Expect(tmpOp.queryForUIDs).to.contain('eq(IDAnimal, 9)');
					}
				);
				test
				(
					'Undelete Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.IDUser = 37;
						tmpQuery.buildUndeleteQuery();
						_Fable.log.trace('Undelete Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('upsert');
						Expect(tmpOp.queryName).to.equal('undeleteTargets');
						Expect(tmpOp.update.Deleted).to.equal(0);
						Expect(tmpOp.update.UpdateDate).to.equal('$$NOW');
						Expect(tmpOp.update.UpdatingIDUser).to.equal(37);
					}
				);
				test
				(
					'Undelete Query without Deleted column returns noop',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
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
					'dgraphOperation is stored in query.parameters',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal');
						tmpQuery.buildReadQuery();
						Expect(tmpQuery.query.parameters.dgraphOperation).to.be.an('object');
						Expect(tmpQuery.query.parameters.dgraphOperation.type).to.equal('Animal');
						Expect(tmpQuery.query.parameters.dgraphOperation.operation).to.equal('query');
					}
				);
				test
				(
					'Filter with comparison operators',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('Age', 10, '>')
							.addFilter('Cost', 100, '<=');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.query).to.contain('gt(Age, 10)');
						Expect(tmpOp.query).to.contain('le(Cost, 100)');
					}
				);
				test
				(
					'Filter with LIKE operator converts to regexp',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('Name', '%Foo%', 'LIKE');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.query).to.contain('regexp(Name, /.*Foo.*/i)');
					}
				);
				test
				(
					'Filter with IS NULL',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('Description', '', 'IS NULL');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.query).to.contain('NOT has(Description)');
					}
				);
				test
				(
					'Filter with != operator',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('Name', 'Cat', '!=');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.query).to.contain('NOT eq(Name, "Cat")');
					}
				);
				test
				(
					'Filter with NOT IN operator',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addFilter('IDOffice', [1, 2, 3], 'NOT IN');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.query).to.contain('NOT eq(IDOffice, [1, 2, 3])');
					}
				);
				test
				(
					'Multiple sorts ascending and descending',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('DGraph')
							.setScope('Animal')
							.addSort({Column:'Name', Direction:'Ascending'})
							.addSort({Column:'Age', Direction:'Descending'});
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.query).to.contain('orderasc: Name');
						Expect(tmpOp.query).to.contain('orderdesc: Age');
					}
				);
			}
		);
	}
);
