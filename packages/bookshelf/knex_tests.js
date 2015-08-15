Tinytest.add('knex - sql to mongo', (test) => {
  function t (query, ans, desc) {
    const res = query.toMongoQuery();
    Object.keys(ans).forEach((prop) => {
      test.equal(res[prop], ans[prop], desc + ' -- ' + prop);
    });
  }

  t(
    Knex('table'),
    {
      method: 'find',
      collection: 'table',
      selector: {},
      projection: {}
    },
    'simple find all'
  );

  t(
    Knex('table').select('field_a', 'field_b'),
    {
      method: 'find',
      collection: 'table',
      selector: {},
      projection: {
        field_a: 1,
        field_b: 1
      }
    },
    'select columns'
  );

  t(
    Knex('table').where('field_a', 'some value'),
    {
      method: 'find',
      collection: 'table',
      selector: {
        field_a: {$eq: 'some value'}
      },
      projection: {}
    },
    'equality where'
  );

  t(
    Knex('table').where('field_a', '>', 2).where('field_b', '<=', 123),
    {
      method: 'find',
      collection: 'table',
      selector: {
        field_a: { $gt: 2 },
        field_b: { $lte: 123 }
      },
      projection: {}
    },
    'numeric comparisons in WHERE'
  );


  t(
    Knex('table').where('field_a', '>', 2).where('field_a', '<=', 123).where('field_a', '<>', 5),
    {
      method: 'find',
      collection: 'table',
      selector: {
        field_a: { $gt: 2, $lte: 123, $ne: 5 }
      },
      projection: {}
    },
    'numeric comparisons in WHERE for the same column'
  );
});
