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
});
