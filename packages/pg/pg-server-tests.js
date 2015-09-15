Table = null; //                                          All being well we'll overwrite this later
const tablename = 'testing'; //                           Pick a sensible (?) table name

Tinytest.add('pg - schema-builder - create testing table', (test) => {
  if (Meteor.isServer) {
    let dropTable = function() { //                       Set up a promised drop table
      let promise = PG.knex.schema.dropTableIfExists(tablename);
      return Promise.resolve(promise).await();
    };

    let createTable = function() { //                     Set up a promised create table
      let promise = PG.knex.schema.createTable(tablename, function(table) {
        table.increments();
        table.string('name');
      });
      return Promise.resolve(promise).await();
    };

    dropTable(); //                                       Drop the table (if it exists)
    createTable(); //                                     Create the table
  }
  Table = new PG.Table('testing');
});


Tinytest.add('pg - query-builder - add rows to testing table', (test) => {
  Table.delete().run(); //                                Truncate table (only works on the server)

  Table.insert({id:1, name: 'Bob'}).run(); //             Add 'Bob' as id 1
  row = Table.where('id', 1).fetch(); //                  Return row with id 1
  test.equal(row.length, 1); //                           There should be one (and only one)
  test.equal(row[0].name, 'Bob'); //                      And his name should be Bob

  Table.insert({id:2, name: 'Carol'}).run(); //           Add 'Carol' as id 2
  row = Table.where('id', 2).fetch(); //                  Return row with id 2
  test.equal(row.length, 1); //                           There should be one (and only one)
  test.equal(row[0].name, 'Carol'); //                    And her name should be Carol
});

Tinytest.add('pg - query-builder - check correct row count', (test) => {
  let n = +Table.count('* AS n').fetch()[0].n;
  test.equal(n, 2); //                                    We inserted two rows, so we should have two rows
});

Tinytest.add('pg - query-builder - check update works', (test) => {
  Table.update({name: 'Ted'}).where('id', 1).run(); //    Change Bob to Ted
  bob = Table.where('id', 1).fetch()[0];
  test.equal(bob.name, 'Ted'); //                         Bob should now be Ted

  Table.update({name: 'Alice'}).where('id', 2).run(); //  Change Carol to Alice
  carol = Table.where('id', 2).fetch()[0];
  test.equal(carol.name, 'Alice'); //                     Carol should now be Alice
});
