PG = {};

PG.defaultConnectionUrl = process.env.POSTGRESQL_URL || 'postgres://127.0.0.1/postgres';

var pg = Npm.require('pg');
var LivePg = Npm.require('pg-live-select');

var pgClient = Meteor.wrapAsync(pg.connect.bind(pg))(PG.defaultConnectionUrl);
var livePg = new LivePg(PG.defaultConnectionUrl, 'simple_pg_' + Random.id(4));
var handles = [];

PG.Query = function (sqlString, name, options) {
  this.name = name;
  this.sqlString = sqlString;
  this.options = options || {};
};

PG.Query.prototype.run = function () {
  var transform = this.options.transform || function (x) { return x; };
  var queryFn = Meteor.wrapAsync(pgClient.query.bind(pgClient));
  return _.map(queryFn(this.sqlString, []).rows, transform);
};

PG.Query.prototype.observe = function (cbs) {
  cbs = cbs || {};
  var select = livePg.select(this.sqlString);
  handles.push(select);

  // defaults to identity
  var transform = this.options.transform || function (x) { return x; };

  select.on('update', function (diff) {
    diff.added.forEach(function (d) {
      cbs.added && cbs.added(transform(d));
    });
    diff.changed.forEach(function (ds) {
      cbs.changed && cbs.changed(transform(ds[0]), transform(ds[1]));
    });
    diff.removed.forEach(function (d) {
      cbs.removed && cbs.removed(transform(d));
    });
  });
  select.on('error', function (err) {
    throw err;
  });

  return {
    stop: function (cb) {
      var index = handles.indexOf(select);
      if (index > -1) {
        handles.splice(index, 1);
      }
    }
  };
};

PG.Query.prototype._publishCursor = function (sub) {
  var table = this.name;

  var observeHandle = this.observe({
    added: function (doc) {
      sub.added(table, doc.id, doc);
    },
    changed: function (newDoc, oldDoc) {
      sub.changed(table, newDoc.id, makeChangedFields(newDoc, oldDoc));
    },
    removed: function (doc) {
      sub.removed(table, doc.id);
    }
  });

  sub.onStop(function () {observeHandle.stop();});
};


// XXX copy pasted, should be taken from the diff-sequence package once this change is out in Meteor 1.2
var diffObjects = function (left, right, callbacks) {
  _.each(left, function (leftValue, key) {
    if (_.has(right, key))
      callbacks.both && callbacks.both(key, leftValue, right[key]);
    else
      callbacks.leftOnly && callbacks.leftOnly(key, leftValue);
  });
  if (callbacks.rightOnly) {
    _.each(right, function(rightValue, key) {
      if (!_.has(left, key))
        callbacks.rightOnly(key, rightValue);
    });
  }
};


// XXX copy pasted, should be taken from the diff-sequence package once this change is out in Meteor 1.2
var makeChangedFields = function (newDoc, oldDoc) {
  var fields = {};
  diffObjects(oldDoc, newDoc, {
    leftOnly: function (key, value) {
      fields[key] = undefined;
    },
    rightOnly: function (key, value) {
      fields[key] = value;
    },
    both: function (key, leftValue, rightValue) {
      if (!EJSON.equals(leftValue, rightValue))
        fields[key] = rightValue;
    }
  });
  return fields;
};
