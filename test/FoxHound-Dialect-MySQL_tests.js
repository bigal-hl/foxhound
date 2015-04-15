/**
* Unit tests for FoxHound
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

var Chai = require('chai');
var Expect = Chai.expect;
var Assert = Chai.assert;

var libFable = require('fable');
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

suite
(
	'FoxHound-Dialect-MySQL',
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
						var testFoxHound = libFoxHound.new(libFable).setDialect('MySQL');
						Expect(testFoxHound.dialect.name)
							.to.equal('MySQL');
						Expect(testFoxHound)
							.to.be.an('object', 'FoxHound with MySQL should initialize as an object directly from the require statement.');
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
						var tmpQuery = libFoxHound.new(libFable)
							.setLogLevel(5)
							.setDialect('MySQL')
							.setScope('Animal')
							.addRecord({IDAnimal:null, Name:'Foo Foo', Age:15});
						// Build the query
						tmpQuery.buildCreateQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Create Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal("INSERT INTO `Animal` ( IDAnimal, Name, Age) VALUES ( :IDAnimal_0, :Name_1, :Age_2);");
					}
				);
				test
				(
					'Bad Create Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable).setDialect('MySQL');
						// Build the query
						tmpQuery.buildCreateQuery();
						tmpQuery.addRecord({});
						tmpQuery.buildCreateQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Create Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal(false);
					}
				);
				test
				(
					'Read Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable).setDialect('MySQL').setScope('Animal');
						// Build the query
						tmpQuery.buildReadQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Simple Select Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal('SELECT * FROM `Animal`;');
					}
				);
				test
				(
					'Complex Read Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable)
							.setDialect('MySQL')
							.setScope('Animal')
							.setCap(10)
							.setBegin(0)
							.setDataElements(['Name', 'Age', 'Cost'])
							.setSort([{Column:'Age',Direction:'Ascending'},{Column:'Cost',Direction:'Descending'}])
							.setFilter({Column:'Age',Operator:'=',Value:'15',Connector:'AND',Parameter:'Age'});
						// Build the query
						tmpQuery.buildReadQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Select Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal('SELECT Name, Age, Cost FROM `Animal` WHERE Age = :Age_w0 ORDER BY Age, Cost DESC LIMIT 0, 10;');
					}
				);
				test
				(
					'Complex Read Query 2',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable)
							.setDialect('MySQL')
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
						// Build the query
						tmpQuery.buildReadQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Select Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal('SELECT Name, Age, Cost FROM `Animal` WHERE Age = :Age_w0 AND ( Color = :Color_w2 OR Color = :Color_w3 ) AND Description IS NOT NULL AND IDOffice IN ( :IDOffice_w6 ) LIMIT 100;');
					}
				);
				test
				(
					'Custom Read Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable)
							.setDialect('MySQL')
							.setScope('Animal')
							.setCap(10)
							.setBegin(0)
							.setDataElements(['Name', 'Age', 'Cost'])
							.setSort([{Column:'Age',Direction:'Ascending'},{Column:'Cost',Direction:'Descending'}])
							.setFilter({Column:'Age',Operator:'=',Value:'15',Connector:'AND',Parameter:'Age'});
						tmpQuery.parameters.queryOverride = 'SELECT Name, Age * 5, Cost FROM <%= TableName %> <%= Where %> <%= Limit %>;';
						// Build the query
						tmpQuery.buildReadQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Custom Select Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal('SELECT Name, Age * 5, Cost FROM  `Animal`  WHERE Age = :Age_w0  LIMIT 0, 10;');
					}
				);
				test
				(
					'Bad Custom Read Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable)
							.setDialect('MySQL')
							.setScope('Animal')
							.setCap(10)
							.setBegin(0)
							.setDataElements(['Name', 'Age', 'Cost'])
							.setSort([{Column:'Age',Direction:'Ascending'},{Column:'Cost',Direction:'Descending'}])
							.setFilter({Column:'Age',Operator:'=',Value:'15',Connector:'AND',Parameter:'Age'});
						tmpQuery.parameters.queryOverride = 'SELECT Name, Age * 5, Cost FROM <%= TableName  <%= Where %> <%= Limit ;';
						// Build the query
						tmpQuery.buildReadQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Custom Select Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal(false);
					}
				);
				test
				(
					'Bad Custom Count Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable)
							.setDialect('MySQL')
							.setScope('Animal')
							.setFilter({Column:'Age',Operator:'=',Value:'15',Connector:'AND',Parameter:'Age'});
						tmpQuery.parameters.queryOverride = 'SELECT COUNT(*) AS RowCount FROM <%= TableName  <%= TableName %> <%= Where;';
						// Build the query
						tmpQuery.buildCountQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Custom Count Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal(false);
					}
				);
				test
				(
					'Custom Count Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable)
							.setDialect('MySQL')
							.setScope('Animal')
							.setFilter({Column:'Age',Operator:'=',Value:'15',Connector:'AND',Parameter:'Age'});
						tmpQuery.parameters.queryOverride = 'SELECT COUNT(*) AS RowCount FROM <%= TableName %> <%= Where %>;';
						// Build the query
						tmpQuery.buildCountQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Custom Count Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal('SELECT COUNT(*) AS RowCount FROM  `Animal`  WHERE Age = :Age_w0;');
					}
				);
				test
				(
					'Update Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable).setDialect('MySQL')
							.setLogLevel(5)
							.setScope('Animal')
							.addFilter('IDAnimal', 9)
							.addRecord({Age:15,Color:'Brown'});

						// Build the query
						tmpQuery.buildUpdateQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Update Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal('UPDATE `Animal` SET Age = :Age_0, Color = :Color_1 WHERE IDAnimal = :IDAnimal_w0;');
					}
				);
				test
				(
					'Bad Update Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable).setDialect('MySQL');

						// Build the query
						tmpQuery.buildUpdateQuery();
						tmpQuery.addRecord({});
						tmpQuery.buildUpdateQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Update Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal(false);
					}
				);
				test
				(
					'Delete Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable).setDialect('MySQL')
							.setScope('Animal')
							.addFilter('IDAnimal', 10);

						// Build the query
						tmpQuery.buildDeleteQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Delete Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal('DELETE FROM `Animal` WHERE IDAnimal = :IDAnimal_w0;');
					}
				);
				test
				(
					'Count Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable)
							.setDialect('MySQL')
							.setScope('Animal');

						// Build the query
						tmpQuery.buildCountQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Count Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal('SELECT COUNT(*) AS RowCount FROM `Animal`;');
					}
				);
			}
		);

		suite
		(
			'Complex Query Generation - Schemas',
			function()
			{
				test
				(
					'Create Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable)
							.setLogLevel(5)
							.setDialect('MySQL')
							.setScope('Animal')
							.addRecord(
							{
								IDAnimal:false, 
								GUIDAnimal:false, 
								CreateDate:false, 
								CreatingIDUser:false, 
								UpdateDate:false, 
								UpdatingIDUser:false, 
								Deleted:false, 
								DeletingIDUser:false, 
								DeleteDate:false, 
								Name:'Froo Froo',
								Age:18
							});
						tmpQuery.query.schema = _AnimalSchema;
						// Build the query
						tmpQuery.buildCreateQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Create Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal("INSERT INTO `Animal` ( IDAnimal, GUIDAnimal, CreateDate, CreatingIDUser, UpdateDate, UpdatingIDUser, Deleted, Name, Age) VALUES ( NULL, :GUIDAnimal_1, NOW(), :CreatingIDUser_3, NOW(), :UpdatingIDUser_5, :Deleted_6, :Name_7, :Age_8);");
					}
				);
				test
				(
					'Update Query',
					function()
					{
						var tmpQuery = libFoxHound.new(libFable).setDialect('MySQL')
							.setLogLevel(5)
							.setScope('Animal')
							.addFilter('IDAnimal', 9)
							.addRecord({
								IDAnimal:82, 
								GUIDAnimal:'1111-2222-3333-4444-5555-6666-7777', 
								CreateDate:false, 
								CreatingIDUser:false, 
								UpdateDate:false, 
								UpdatingIDUser:false, 
								Deleted:false, 
								DeletingIDUser:false, 
								DeleteDate:false, 
								Name:'Froo Froo',
								Age:18
							});
						tmpQuery.query.schema = _AnimalSchema;
						// Build the query
						tmpQuery.buildUpdateQuery();
						// This is the query generated by the MySQL dialect
						libFable.log.trace('Update Query', tmpQuery.query);
						Expect(tmpQuery.query.body)
							.to.equal('UPDATE `Animal` SET GUIDAnimal = :GUIDAnimal_0, UpdateDate = NOW(), UpdatingIDUser = :UpdatingIDUser_2, Deleted = :Deleted_3, Name = :Name_4, Age = :Age_5 WHERE IDAnimal = :IDAnimal_w0;');
					}
				);
			}
		);
	}
);