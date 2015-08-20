import {EventEmitter} from 'events';
import Future from 'fiber/future';
import pg from 'pg';
import {murmur3} from 'murmurhash-js';

class PgLiveQuery extends EventEmitter {
  constructor({connectionUrl, channel}) {
    super();

    this.connectionUrl = connectionUrl;
    this.channel = channel || Random.id(5);
    this.triggerFunction = 'livequery_' + this.channel;
    this.cleanupCbs = [];
    this.queries = {};
    this.outstandingPayloads = {};
    this.queue = [];
    this.queriesByTable = {};
    this.drainQueue = false;

    this.queryCallbacks = {};

    this._setupTriggers();
    this._setupListener();
    this._drainQueue();
  }

  // main interface
  select(
    // sql query
    query,
    // params that replace $1, $2, $3, etc
    params = [],
    // callbacks that approve/disaprove the polls on triggers
    pollValidators={},
    // additional callbacks for "update", specific to this query
    callbacks = {}) {
      const queryHash = murmur3(JSON.stringify([ query, params ]));

      const added = callbacks.added || noop;
      const changed = callbacks.changed || noop;
      const removed = callbacks.removed || noop;

      const cb = (updates, qh) => {
        if (queryHash !== qh) return;
        updates.removed.forEach(r => removed(r));
        updates.changed.forEach(r => changed(r));
        updates.added.forEach(r => added(r));
      };

      const handle = {
        stop: () => {
          this._stopSelect(queryHash);
        },
        _queryHash: queryHash,
        _cb: cb
      };

      this.on('update', cb);
      this._setupSelect(query, params, pollValidators, handle);

      // seed initial
      const update = this._processDiff({}, this.queries[queryHash].data);
      cb(update, queryHash);

      return handle;
  }

  _setupSelect(query, params, pollValidators, handle) {
    const queryHash = handle._queryHash;

    if (queryHash in this.queries) {
      // dedup
      const queryBuffer = this.queries[queryHash];
      queryBuffer.handlers.push(handle);

      // wait until it is populated
      if (! queryBuffer.initialized) {
        queryBuffer.initializedFuture.wait();
      }
      return;
    }

    // this is a new query!
    const newBuffer = {
      // the inputs
      query,
      params,
      pollValidators,
      handers: [handle],
      // where we store the working set
      data: {},
      // until initialized, deduplicated queries should await
      initialized: false,
      initializedFuture: new Future
    };

    // add immediately before any yields, so the new deduped queries see it
    this.queries[queryHash] = newBuffer;

    // attach triggers
    const tablesInQuery =
      findDependentRelations(this.client, query, params);
    const triggersQueries = [];
    tablesInQuery.forEach((table) => {
      if (table in this.queriesByTable) {
        if (this.queriesByTable[table].indexOf(queryHash) === -1)
          this.queriesByTable[table].push(queryHash);
        return;
      }

      this.queriesByTable[table] = [queryHash];
      const triggerName = this.channel + '_' + table;
      triggersQueries.push(
        'DROP TRIGGER IF EXISTS "' + triggerName + '" ON "' + table + '"');
      triggersQueries.push(
        'CREATE TRIGGER "' + triggerName + '" ' +
        'AFTER INSERT OR UPDATE OR DELETE ON "' + table + '" ' +
        'FOR EACH ROW EXECUTE PROCEDURE "' + this.triggerFun + '"()');
    });

    if (triggersQueries.length !== 0) {
      this._runQueries(triggersQueries);
    }

    this.queue.push(queryHash);
    queryBuffer.initializedFuture.wait();
  }

  _setupTriggers() {
    const {triggerFunction, channel} = this;
    this._runQuery(
      [loadQuery('setup-triggers', { triggerFunction, channel })],
      (err) => {
        if (err) {
          this.emit('error', err);
        }
      }
    );
  }

  _setupListener() {
    const allFuture = new Future;

    pg.connect(this.connectionUrl, (error, client, done) => {
      if (error) {
        allFuture.throw(error);
        return;
      }

      this.client = client;
      this.client.querySync =
        Meteor.wrapAsync(this.client.query.bind(this.query));
      this.cleanupCbs.push(done);
      
      client.query('LISTEN "' + this.channel + '"', (error) => {
        if (error) { allFuture.throw(error); return; }
      });

      const Mbe = Meteor.bindEnvironment;
      client.on('notification', Mbe((info) => {
        let payload = this._processNotification(info.payload);
        // Only continue if full notification has arrived
        if (payload === null) return;

        try {
          payload = JSON.parse(payload);
        } catch(error) {
          allFuture.throw(new Error('INVALID_NOTIFICATION ' + payload));
          return;
        }

        if (payload.table in this.queriesByTable) {
          this.queriesByTable[payload.table].forEach((queryHash) => {
            const queryBuffer = this.queries[queryHash];
            if ((queryBuffer.pollValidators
                // Check for true response from manual trigger
                && payload.table in queryBuffer.pollValidators
                && (payload.op === 'UPDATE'
                  // Rows changed in an UPDATE operation must check old and new
                  ? queryBuffer.pollValidators[payload.table](payload.new_data[0])
                    || queryBuffer.pollValidators[payload.table](payload.old_data[0])
                  // Rows changed in INSERT/DELETE operations only check once
                  : queryBuffer.pollValidators[payload.table](payload.data[0])))
              || (queryBuffer.pollValidators
                // No manual trigger for this table, always refresh
                && !(payload.table in  queryBuffer.pollValidators))
              // No manual triggers at all, always refresh
              || !queryBuffer.pollValidators) {
                this.queue.push(queryHash);
                this._scheduleQueueDrain();
            }
          });
        }
      }));
    });

    return allFuture.wait();
  }

  _updateQuery(queryHash) {
    const queryBuffer = this.queries[queryHash];
    const oldHashes = _.values(queryBuffer.data).map(row => row._hash);

    const client = this.client;
    const queryParams = queryBuffer.params.concat([ oldHashes ]);

    const result = client.querySync(loadQuery('poll', {
      query: queryBuffer.query,
      // an extra param that we append in our wrapper: old hashes
      hashParam: queryBuffer.params.length + 1
    }), queryParams).rows;

    const newData = {};
    result.forEach((row) => {
      if (! row.id)
        throw new Error('LiveQuery requires queries to return a unique non-null `id` column');

      newData[row.id] = row;
    });

    const update = this._processDiff(queryBuffer.data, newData);
    queryBuffer.data = newData;

    if (queryBuffer.initialized) {
      this.emit('update', update, queryHash);
    } else {
      queryBuffer.initialized = true;
      const queryFuture = queryBuffer.initializedFuture;
      queryBuffer.initializedFuture = null;
      queryFuture.return();
    }
  }

  _processDiff(oldData, newData) {
    const removed = [];
    const changed = [];
    const added = [];

    Object.keys(oldData).forEach((oldRow) => {
      if (! newData[oldRow.id])
        removed.push(oldRow);
    });
    Object.keys(newData).forEach((newRow) => {
      const id = newRow.id;
      if (oldData[id]) {
        const oldRow = oldData[id];
        if (oldRow._hash !== newRow._hash) {
          changed.push(
            filterHashProperties(newRow),
            filterHashProperties(oldRow)
          );
        }
      } else {
        added.push(newRow);
      }
    });

    return {added, changed, removed};
  }

  _scheduleQueueDrain() {
    if (this.drainQueue) return;
    this.drainQueue = true;
    Meteor.setTimeout(this._drainQueue.bind(this), 0);
  }

  _drainQueue() {
    this.drainQueue = false;
    const queriesToUpdate =
      _.uniq(this.queue.splice(0, this.queue.length));

    queriesToUpdate.forEach((queryHash) => {
      this._updateQuery(queryHash);
    });
  }

  _processNotification(payload) {
    const argSep = [];

    // Notification is 4 parts split by colons
    while (argSep.length < 3) {
      const lastPos = argSep.length ? argSep[argSep.length - 1] + 1 : 0;
      argSep.push(payload.indexOf(':', lastPos));
    }

    const msgHash   = payload.slice(0, argSep[0]);
    const pageCount = payload.slice(argSep[0] + 1, argSep[1]);
    const curPage   = payload.slice(argSep[1] + 1, argSep[2]);
    const msgPart   = payload.slice(argSep[2] + 1, argSep[3]);
    let fullMsg;

    if (pageCount > 1) {
      // Piece together multi-part messages
      if (!(msgHash in this.outstandingPayloads)) {
        this.outstandingPayloads[msgHash] =
          _.range(pageCount).map(function () { return null; });
      }
      this.outstandingPayloads[msgHash][curPage - 1] = msgPart;

      if (this.outstandingPayloads[msgHash].indexOf(null) !== -1) {
        return null; // Must wait for full message
      }

      fullMsg = this.outstandingPayloads[msgHash].join('');

      delete this.outstandingPayloads[msgHash];
    }
    else {
      // Payload small enough to fit in single message
      fullMsg = msgPart;
    }

    return fullMsg;
  }

  _runQueries(queries) {
    const allFuture = new Future;
    const futures = [];

    pg.connect(this.connectionUrl, (error, client, done) => {
      if (error) { allFuture.throw(error); return; }

      queries.forEach((query) => {
        let params;
        if (query instanceof Array) {
          // Allow array containing [ query_string, params ]
          params = query[1];
          query = query[0];
        } else {
          params = [];
        }

        const future = new Future;
        const Mbe = Meteor.bindEnvironment;
        client.query(query, params, Mbe(function (error, result) {
          if (error) {
            done();
            future.throw(error);
            return;
          }
          future.return(result);
        }));
        futures.push(future);
      });

      Future.wait(futures);
      done();
      allFuture.return(futures.map(future => future.get()));
    });

    return allFuture.wait();
  }
}

function loadQuery(name, kwargs) {
  const queryTemplate = Assets.getText(name + '.sql');
  let query = queryTemplate;
  Object.keys(kwargs).forEach(function (argName) {
    query = query.replace(
      new RegExp('\\\$\\\$' + argName + '\\\$\\\$', 'g'), kwargs[argName]);
  });

  return query;
}

function filterHashProperties(obj) {
  if (obj instanceof Object) {
    return _.omit(obj, '_hash');
  }
  throw new Error('bad call of filterHashProperties ' + JSON.stringify(obj));
}

function findDependentRelations(client, query, params) {
  var nodeWalker = function (tree) {
    var found = [];

    var checkNode = function (node) {
      if ('Plans' in node) found = found.concat(nodeWalker(node['Plans']));
      if ('Relation Name' in node) found.push(node['Relation Name']);
    };

    if (tree instanceof Array) tree.forEach(checkNode);
    else checkNode(tree);

    return found;
  };

  const fut = new Future;

  client.query(
    'EXPLAIN (FORMAT JSON) ' + query, params,
    function (error, result) {
      if (error) {
        fut.throw(error);
        return;
      }

      var nodeWalkerResult = nodeWalker(result.rows[0]['QUERY PLAN'][0]['Plan']);

      fut.return(nodeWalkerResult);
    });

  return fut.wait();
}

function noop () {}
