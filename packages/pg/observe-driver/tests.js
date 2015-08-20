const pg = Npm.require('pg');

const connectionUrl = process.env.POSTGRES_URL || 'postgres://127.0.0.1/postgres';

Tinytest.add('pg - polling-driver - basic', (test) => {
  const db = new PgLiveQuery({connectionUrl});
  const run = db.client.querySync.bind(db.client);

  run('DROP TABLE IF EXISTS employees;');
  run('CREATE TABLE employees (id serial primary key, name text);');
  run('INSERT INTO employees(name) VALUES (\'slava\');');
  run('INSERT INTO employees(name) VALUES (\'sashko\');');

  const notifs = [];
  db.select('SELECT * FROM employees', [], {}, {
    added(newVal) {
      notifs.push(['added', newVal]);
    },
    changed(newVal, oldVal) {
      notifs.push(['changed', newVal, oldVal]);
    },
    removed(oldVal) {
      notifs.push(['removed', oldVal]);
    }
  });

  test.equal(notifs.shift(), ['added', {id: 1, name: 'slava'}]);
  test.equal(notifs.shift(), ['added', {id: 2, name: 'sashko'}]);

  run('UPDATE employees SET name=\'avital\' where id=2');
  test.equal(notifs.shift(), ['changed', {id: 2, name: 'avital'}, {id: 2, name: 'sashko'}]);

  db.stop();
});
