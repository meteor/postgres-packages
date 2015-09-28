let Table = null; //                                      All being well we'll overwrite this later
const tablename = 'testing'; //                           Pick a sensible (?) table name

Tinytest.add('pg - schema builder - create testing table', (test) => {
  function dropTable() { //                               Set up a promised drop table
    let promise = PG.knex.schema.dropTableIfExists(tablename);
    return Promise.await(promise);
  };

  function createTable() { //                             Set up a promised create table
    let promise = PG.knex.schema.createTable(tablename, (table) => {
      table.increments();
      table.string('name');
    });
    return Promise.await(promise);
  };

  dropTable(); //                                         Drop the table (if it exists)
  createTable(); //                                       Create the table
  Table = new PG.Table('testing'); //                     Ready to test pg package functionality
});


Tinytest.add('pg - query builder - add rows to testing table', (test) => {
  let row;
  Table.delete().run(); //                                Truncate table (only works on the server)

  Table.insert({id:1, name: 'Bob'}).run(); //             Add 'Bob' as id 1
  row = Table.where({id: 1}).fetch(); //                  Return row with id 1
  test.equal(row.length, 1); //                           There should be one (and only one)
  test.equal(row[0].name, 'Bob'); //                      And his name should be Bob

  Table.insert({id:2, name: 'Carol'}).run(); //           Add 'Carol' as id 2
  row = Table.where({id: 2}).fetch(); //                  Return row with id 2
  test.equal(row.length, 1); //                           There should be one (and only one)
  test.equal(row[0].name, 'Carol'); //                    And her name should be Carol
});

Tinytest.add('pg - query builder - check correct row count', (test) => {
  const n = +Table.count('* AS n').fetch()[0].n;
  test.equal(n, 2); //                                    We inserted two rows, so we should have two rows
});

Tinytest.add('pg - query builder - check update works', (test) => {
  Table.update({name: 'Ted'}).where({id: 1}).run(); //    Change Bob to Ted
  const bob = Table.where({id: 1}).fetch()[0];
  test.equal(bob.name, 'Ted'); //                         Bob should now be Ted

  Table.update({name: 'Alice'}).where({id: 2}).run(); //  Change Carol to Alice
  const carol = Table.where({id: 2}).fetch()[0];
  test.equal(carol.name, 'Alice'); //                     Carol should now be Alice
});

Tinytest.add('pg - query builder - check fetchOne works', (test) => {
  const row = Table.fetchOne(); //                        Grab a row
  test.isTrue(row instanceof Object); //                  We should have an object
  test.isTrue('id' in row); //                            with an id column
  test.isTrue('name' in row); //                          and a name column
  test.isUndefined(Table.where({id: 999}).fetchOne()); // Look for a non-existant id and make sure we get undefined
});

Tinytest.add('pg - query builder - check fetchValue works', (test) => {
  const n = +Table.count('*').fetchValue(); //            Start with a quick count(*)
  test.equal(n, 2); //                                    We should have a count of 2
  const name = Table.where({id: 2}).fetchValue('name'); //Get Alice
  test.equal(name, 'Alice'); //                           Should be "Alice"
  //                                                      Look for a non-existant column and make sure we get undefined
  test.isUndefined(Table.where({id: 2}).fetchValue('age'));
  test.throws(() => { //                                  Make sure "must be a string" is thrown
    Table.where({id: 2}).fetchValue({});
  }, 'PG: fetchValue parameter not string');
  //                                                      Check findOne's early return for no rows: make sure we get undefined
  test.isUndefined(Table.where({id: 999}).fetchValue('name'));
});
