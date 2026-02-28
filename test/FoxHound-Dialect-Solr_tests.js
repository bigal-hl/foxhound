/**
* Unit tests for FoxHound Solr Dialect
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

var Chai = require('chai');
var Expect = Chai.expect;
var Assert = Chai.assert;

var libFable = require('fable');
const _Fable = new libFable({Product:'FoxhoundTestsSolr'});
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
	'FoxHound-Dialect-Solr',
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
						var testFoxHound = libFoxHound.new(_Fable).setDialect('Solr');
						Expect(testFoxHound.dialect.name)
							.to.equal('Solr');
						Expect(testFoxHound)
							.to.be.an('object', 'FoxHound with Solr should initialize as an object directly from the require statement.');
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
							.setDialect('Solr')
							.setScope('Animal')
							.addRecord({IDAnimal:null, Name:'Foo Foo', Age:15});
						tmpQuery.buildCreateQuery();
						_Fable.log.trace('Create Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.collection).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('add');
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
							.setDialect('Solr')
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
							.setDialect('Solr')
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
						var tmpQuery = libFoxHound.new(_Fable).setDialect('Solr');
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
						var tmpQuery = libFoxHound.new(_Fable).setDialect('Solr').setScope('Animal');
						tmpQuery.buildReadQuery();
						_Fable.log.trace('Simple Select Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.collection).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('search');
						Expect(tmpOp.query).to.equal('*:*');
					}
				);
				test
				(
					'Read Query with Sort',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable).setDialect('Solr').setScope('Animal');
						tmpQuery.addSort({Column:'Cost',Direction:'Descending'});
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.sort).to.equal('Cost desc');
					}
				);
				test
				(
					'Read Query with Distinct',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable).setDialect('Solr').setScope('Animal');
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
							.setDialect('Solr')
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
						Expect(tmpOp.rows).to.equal(10);
						Expect(tmpOp.start).to.equal(5);
						Expect(tmpOp.sort).to.contain('Age asc');
						Expect(tmpOp.sort).to.contain('Cost asc');
						Expect(tmpOp.filterQuery).to.contain('Age:"15"');
						Expect(tmpOp.fields).to.contain('Name');
						Expect(tmpOp.fields).to.contain('Age');
						Expect(tmpOp.fields).to.contain('Cost');
					}
				);
				test
				(
					'Complex Read Query with Filters including OR, IN, IS NOT NULL',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
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
						// Should have filter query
						Expect(tmpOp.filterQuery).to.contain('Age:"25"');
						// OR group in parentheses
						Expect(tmpOp.filterQuery).to.contain('(Color:"Red" OR Color:"Green")');
						// IS NOT NULL
						Expect(tmpOp.filterQuery).to.contain('Description:[* TO *]');
						// IN
						Expect(tmpOp.filterQuery).to.contain('IDOffice:(10 OR 11 OR 15 OR 18 OR 22)');
					}
				);
				test
				(
					'Read Query with Deleted schema auto-adds Deleted filter',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('Age', '3');
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filterQuery).to.contain('Deleted:0');
					}
				);
				test
				(
					'Read Query with Deleted tracking disabled does NOT add Deleted filter',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('Age', '3');
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.disableDeleteTracking = true;
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filterQuery).to.not.contain('Deleted:0');
					}
				);
				test
				(
					'Read Query without limit has no rows or start',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp).to.not.have.property('rows');
						Expect(tmpOp).to.not.have.property('start');
					}
				);
				test
				(
					'Update Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('IDAnimal', 9)
							.addRecord({Name:'Froggy', Age:12});
						tmpQuery.buildUpdateQuery();
						_Fable.log.trace('Update Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.collection).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('atomicUpdate');
						Expect(tmpOp.filterQuery).to.contain('IDAnimal:9');
						Expect(tmpOp.update.Name).to.deep.equal({ 'set': 'Froggy' });
						Expect(tmpOp.update.Age).to.deep.equal({ 'set': 12 });
					}
				);
				test
				(
					'Update Query with Schema skips identity and create columns',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
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
						Expect(tmpOp.update.UpdateDate).to.deep.equal({ 'set': '$$NOW' });
						Expect(tmpOp.update.UpdatingIDUser).to.deep.equal({ 'set': 37 });
						Expect(tmpOp.update.Name).to.deep.equal({ 'set': 'Froggy' });
					}
				);
				test
				(
					'Count Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('Age', '3');
						tmpQuery.buildCountQuery();
						_Fable.log.trace('Count Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.collection).to.equal('Animal');
						Expect(tmpOp.operation).to.equal('search');
						Expect(tmpOp.isCount).to.equal(true);
						Expect(tmpOp.rows).to.equal(0);
						Expect(tmpOp.filterQuery).to.contain('Age:"3"');
					}
				);
				test
				(
					'Delete Query with soft delete schema',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.IDUser = 37;
						tmpQuery.buildDeleteQuery();
						_Fable.log.trace('Delete Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('atomicUpdate');
						Expect(tmpOp.filterQuery).to.contain('IDAnimal:9');
						Expect(tmpOp.filterQuery).to.contain('Deleted:0');
						Expect(tmpOp.update.Deleted).to.deep.equal({ 'set': 1 });
						Expect(tmpOp.update.DeleteDate).to.deep.equal({ 'set': '$$NOW' });
						Expect(tmpOp.update.DeletingIDUser).to.deep.equal({ 'set': 37 });
					}
				);
				test
				(
					'Delete Query without schema does hard delete',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.buildDeleteQuery();
						_Fable.log.trace('Delete Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('deleteByQuery');
						Expect(tmpOp.filterQuery).to.contain('IDAnimal:9');
					}
				);
				test
				(
					'Undelete Query',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('IDAnimal', 9);
						tmpQuery.query.schema = _AnimalSchema;
						tmpQuery.query.IDUser = 37;
						tmpQuery.buildUndeleteQuery();
						_Fable.log.trace('Undelete Query', tmpQuery.query);
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.operation).to.equal('atomicUpdate');
						Expect(tmpOp.update.Deleted).to.deep.equal({ 'set': 0 });
						Expect(tmpOp.update.UpdateDate).to.deep.equal({ 'set': '$$NOW' });
						Expect(tmpOp.update.UpdatingIDUser).to.deep.equal({ 'set': 37 });
					}
				);
				test
				(
					'Undelete Query without Deleted column returns noop',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
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
					'solrOperation is stored in query.parameters',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal');
						tmpQuery.buildReadQuery();
						Expect(tmpQuery.query.parameters.solrOperation).to.be.an('object');
						Expect(tmpQuery.query.parameters.solrOperation.collection).to.equal('Animal');
						Expect(tmpQuery.query.parameters.solrOperation.operation).to.equal('search');
					}
				);
				test
				(
					'Filter with comparison operators',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('Age', 10, '>')
							.addFilter('Cost', 100, '<=');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filterQuery).to.contain('Age:{10 TO *}');
						Expect(tmpOp.filterQuery).to.contain('Cost:[* TO 100]');
					}
				);
				test
				(
					'Filter with >= and < operators',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('Age', 10, '>=')
							.addFilter('Cost', 50, '<');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filterQuery).to.contain('Age:[10 TO *]');
						Expect(tmpOp.filterQuery).to.contain('Cost:{* TO 50}');
					}
				);
				test
				(
					'Filter with LIKE operator converts to wildcard',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('Name', '%Foo%', 'LIKE');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filterQuery).to.contain('Name:*Foo*');
					}
				);
				test
				(
					'Filter with IS NULL',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('Description', '', 'IS NULL');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filterQuery).to.contain('(*:* NOT Description:[* TO *])');
					}
				);
				test
				(
					'Filter with != operator',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('Name', 'Cat', '!=');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filterQuery).to.contain('(*:* NOT Name:"Cat")');
					}
				);
				test
				(
					'Filter with NOT IN operator',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addFilter('IDOffice', [1, 2, 3], 'NOT IN');
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.filterQuery).to.contain('(*:* NOT IDOffice:(1 OR 2 OR 3))');
					}
				);
				test
				(
					'Multiple sorts ascending and descending',
					function()
					{
						var tmpQuery = libFoxHound.new(_Fable)
							.setDialect('Solr')
							.setScope('Animal')
							.addSort({Column:'Name', Direction:'Ascending'})
							.addSort({Column:'Age', Direction:'Descending'});
						tmpQuery.buildReadQuery();
						var tmpOp = JSON.parse(tmpQuery.query.body);
						Expect(tmpOp.sort).to.contain('Name asc');
						Expect(tmpOp.sort).to.contain('Age desc');
					}
				);
			}
		);
	}
);
