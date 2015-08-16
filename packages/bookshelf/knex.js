function knex(tableName) {
  var qb = knex.queryBuilder();
  return qb.table(tableName);
}

knex.queryBuilder = function () {
  return new QueryBuilder();
};

knex.VERSION = '0.8.6-minimongo';

const methods = [
  'insert', 'update', 'select', 'delete', 'del',
  'where', 'whereNot', 'whereNull', 'whereNotNull',
  'whereExists', 'whereNotExists', 'whereIn', 'whereNotIn',
  'whereBetween', 'whereNotBetween'
];
methods.forEach(function (method) {
  knex[method] = function (...args) {
    var builder = knex.queryBuilder();
    return builder[method](...args);
  };
});

// most of the builder is copy/pasted from the original knex.js
QueryBuilder = Builder;
function Builder() {
  this.and         = this;
  this._single     = {};
  this._statements = [];

  // Internal flags used in the builder.
  this._method    = 'select';
  this._joinFlag  = 'inner';
  this._boolFlag  = 'and';
  this._notFlag   = false;
}

_.extend(Builder.prototype, {
  toMongoQuery: function (method) {
    return this.queryCompiler(this).toMongoQuery(method || this._method);
  },

  // XXX hack?
  toSQL: function(method) {
    throw new Error('no sql mo problems');
    return this.toMongoQuery();
  },

  clone: function() {
    var cloned            = new this.constructor();
      cloned._method      = this._method;
      cloned._single      = _.clone(this._single);
      cloned._options     = _.clone(this._options);
      cloned._statements  = this._statements.slice();
    return cloned;
  },
  columns: function(column) {
    if (!column) return this;
    this._statements.push({
      grouping: 'columns',
      value: normalizeArr.apply(null, arguments)
    });
    return this;
  },
  as: function(column) {
    this._single.as = column;
    return this;
  },
  table: function(tableName) {
    this._single.table = tableName;
    return this;
  },
  where: function(column, operator, value) {
    // Support "where true || where false"
    if (column === false || column === true) {
      return this.where(1, '=', column ? 1 : 0);
    }

    // Check if the column is a function, in which case it's
    // a where statement wrapped in parens.
    if (typeof column === 'function') {
      return this.whereWrapped(column);
    }

    // Allow a raw statement to be passed along to the query.
    if (column instanceof Raw && arguments.length === 1) return this.whereRaw(column);

    // Allows `where({id: 2})` syntax.
    if (_.isObject(column) && !(column instanceof Raw)) return this._objectWhere(column);

    // Enable the where('key', value) syntax, only when there
    // are explicitly two arguments passed, so it's not possible to
    // do where('key', '!=') and have that turn into where key != null
    if (arguments.length === 2) {
      value    = operator;
      operator = '=';

      // If the value is null, and it's a two argument query,
      // we assume we're going for a `whereNull`.
      if (value === null) {
        return this.whereNull(column);
      }
    }

    // lower case the operator for comparison purposes
    var checkOperator = ('' + operator).toLowerCase().trim();

    // If there are 3 arguments, check whether 'in' is one of them.
    if (arguments.length === 3) {
      if (checkOperator === 'in' || checkOperator === 'not in') {
        return this._not(checkOperator === 'not in').whereIn(arguments[0], arguments[2]);
      }
      if (checkOperator === 'between' || checkOperator === 'not between') {
        return this._not(checkOperator === 'not between').whereBetween(arguments[0], arguments[2]);
      }
    }

    // If the value is still null, check whether they're meaning
    // where value is null
    if (value === null) {

      // Check for .where(key, 'is', null) or .where(key, 'is not', 'null');
      if (checkOperator === 'is' || checkOperator === 'is not') {
        return this._not(checkOperator === 'is not').whereNull(column);
      }
    }

    // Push onto the where statement stack.
    this._statements.push({
      grouping: 'where',
      type: 'whereBasic',
      column: column,
      operator: operator,
      value: value,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },

  orWhere: function() {
    return this._bool('or').where.apply(this, arguments);
  },

  whereNot: function() {
    return this._not(true).where.apply(this, arguments);
  },

  orWhereNot: function() {
    return this._bool('or').whereNot.apply(this, arguments);
  },

  _objectWhere: function(obj) {
    var boolVal = this._bool();
    var notVal = this._not() ? 'Not' : '';
    for (var key in obj) {
      this[boolVal + 'Where' + notVal](key, obj[key]);
    }
    return this;
  },
    whereWrapped: function(callback) {
    this._statements.push({
      grouping: 'where',
      type: 'whereWrapped',
      value: callback,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },

  whereExists: function(callback) {
    this._statements.push({
      grouping: 'where',
      type: 'whereExists',
      value: callback,
      not: this._not(),
      bool: this._bool(),
    });
    return this;
  },

  // Adds an `or where exists` clause to the query.
  orWhereExists: function(callback) {
    return this._bool('or').whereExists(callback);
  },

  // Adds a `where not exists` clause to the query.
  whereNotExists: function(callback) {
    return this._not(true).whereExists(callback);
  },

  // Adds a `or where not exists` clause to the query.
  orWhereNotExists: function(callback) {
    return this._bool('or').whereNotExists(callback);
  },

  // Adds a `where in` clause to the query.
  whereIn: function(column, values) {
    if (Array.isArray(values) && _.isEmpty(values)) return this.where(this._not());
    this._statements.push({
      grouping: 'where',
      type: 'whereIn',
      column: column,
      value: values,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },

  // Adds a `or where in` clause to the query.
  orWhereIn: function(column, values) {
    return this._bool('or').whereIn(column, values);
  },

  // Adds a `where not in` clause to the query.
  whereNotIn: function(column, values) {
    return this._not(true).whereIn(column, values);
  },

  // Adds a `or where not in` clause to the query.
  orWhereNotIn: function(column, values) {
    return this._bool('or')._not(true).whereIn(column, values);
  },

  // Adds a `where null` clause to the query.
  whereNull: function(column) {
    this._statements.push({
      grouping: 'where',
      type: 'whereNull',
      column: column,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },

  // Adds a `or where null` clause to the query.
  orWhereNull: function(column) {
    return this._bool('or').whereNull(column);
  },

  // Adds a `where not null` clause to the query.
  whereNotNull: function(column) {
    return this._not(true).whereNull(column);
  },

  // Adds a `or where not null` clause to the query.
  orWhereNotNull: function(column) {
    return this._bool('or').whereNotNull(column);
  },

  // Adds a `where between` clause to the query.
  whereBetween: function(column, values) {
    assert(Array.isArray(values), 'The second argument to whereBetween must be an array.');
    assert(values.length === 2, 'You must specify 2 values for the whereBetween clause');
    this._statements.push({
      grouping: 'where',
      type: 'whereBetween',
      column: column,
      value: values,
      not: this._not(),
      bool: this._bool()
    });
    return this;
  },

  // Adds a `where not between` clause to the query.
  whereNotBetween: function(column, values) {
    return this._not(true).whereBetween(column, values);
  },

  // Adds a `or where between` clause to the query.
  orWhereBetween: function(column, values) {
    return this._bool('or').whereBetween(column, values);
  },

  // Adds a `or where not between` clause to the query.
  orWhereNotBetween: function(column, values) {
    return this._bool('or').whereNotBetween(column, values);
  },

  orderBy: function(column, direction) {
    this._statements.push({
      grouping: 'order',
      type: 'orderByBasic',
      value: column,
      direction: direction
    });
    return this;
  },
  
  // Only allow a single "offset" to be set for the current query.
  offset: function(value) {
    this._single.offset = value;
    return this;
  },

  // Only allow a single "limit" to be set for the current query.
  limit: function(value) {
    var val = parseInt(value, 10);
    if (isNaN(val)) {
      throw Error('A valid integer must be provided to limit');
    } else {
      this._single.limit = val;  
    }
    return this;
  },

  // Increments a column's value by the specified amount.
  increment: function(column, amount) {
    return this._counter(column, amount);
  },

  // Decrements a column's value by the specified amount.
  decrement: function(column, amount) {
    return this._counter(column, amount, '-');
  },

  insert: function(values, returning) {
    this._method = 'insert';
    if (!_.isEmpty(returning)) this.returning(returning);
    this._single.insert = values;
    return this;
  },

  // Sets the values for an `update`, allowing for both
  // `.update(key, value, [returning])` and `.update(obj, [returning])` syntaxes.
  update: function(values, returning) {
    var ret, obj = this._single.update || {};
    this._method = 'update';
    if (_.isString(values)) {
      obj[values] = returning;
      if (arguments.length > 2) {
        ret = arguments[2];
      }
    } else {
      var i = -1, keys = Object.keys(values);
      if (this._single.update) {
        throw new Error('Update called multiple times with objects.');
      }
      while (++i < keys.length) {
        obj[keys[i]] = values[keys[i]];
      }
      ret = arguments[1];
    }
    if (!_.isEmpty(ret)) this.returning(ret);
    this._single.update = obj;
    return this;
  },

  delete: function(ret) {
    this._method = 'del';
    if (!_.isEmpty(ret)) this.returning(ret);
    return this;
  },

  _counter: function(column, amount, symbol) {
    var amt = parseInt(amount, 10);
    if (isNaN(amt)) amt = 1;
    this._method = 'counter';
    this._single.counter = {
      column: column,
      amount: amt,
      symbol: (symbol || '+')
    };
    return this;
  },
  
  // Helper to get or set the "boolFlag" value.
  _bool: function(val) {
    if (arguments.length === 1) {
      this._boolFlag = val;
      return this;
    }
    var ret = this._boolFlag;
    this._boolFlag = 'and';
    return ret;
  },

  // Helper to get or set the "notFlag" value.
  _not: function(val) {
    if (arguments.length === 1) {
      this._notFlag = val;
      return this;
    }
    var ret = this._notFlag;
    this._notFlag = false;
    return ret;
  }
});

Object.defineProperty(Builder.prototype, 'or', {
  get: function () {
    return this._bool('or');
  }
});

Object.defineProperty(Builder.prototype, 'not', {
  get: function () {
    return this._not(true);
  }
});

Builder.prototype.select      = Builder.prototype.columns;
Builder.prototype.column      = Builder.prototype.columns;
Builder.prototype.andWhereNot = Builder.prototype.whereNot;
Builder.prototype.andWhere    = Builder.prototype.where;
Builder.prototype.andWhereRaw = Builder.prototype.whereRaw;
Builder.prototype.andHaving   = Builder.prototype.having;
Builder.prototype.from        = Builder.prototype.table;
Builder.prototype.into        = Builder.prototype.table;
Builder.prototype.del         = Builder.prototype.delete;

Builder.prototype.queryCompiler = function (queryBuilder) {
  return new QueryCompiler(queryBuilder);
};

function assert(cond, msg) {
  if (! cond) throw new Error(msg);
}
function normalizeArr() {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; i++) {
    args[i] = arguments[i];
  }
  if (Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

// XXX this is a place-holder for Raw, it is not implemented
function Raw () {};



// =============== QueryCompiler ================
function QueryCompiler(builder) {
  this.method      = builder._method || 'select';
  this.options     = builder._options;
  this.single      = builder._single;
  this.grouped     = _.groupBy(builder._statements, 'grouping');
}

var components = [
  'columns', 'where', 'order', 'limit', 'offset',
  // XXX not implemeneted 'join', 'union', 'group', 'having', 'lock'
];

_.extend(QueryCompiler.prototype, {

  // Should return an object with selector, modifier and options
  toMongoQuery: function(method) {
    method = method || this.method;
    return this[method]();
  },

  // Compiles the `select` statement, or nested sub-selects
  // by calling each of the component compilers, trimming out
  // the empties, and returning a generated query string.
  select: function() {
    var i = -1, combined = {};
    while (++i < components.length) {
      _.extend(combined, this[components[i]](this));
    }
    return _.extend({
      collection: this.single.table,
      method: 'find'
    }, combined);
  },
  
  // Compiles an "insert" query, allowing for multiple
  // inserts using a single query statement.
  insert: function() {
    var insertValues = this.single.insert || [];
    var sql = 'insert into ' + this.tableName + ' ';

    if (Array.isArray(insertValues)) {
      if (insertValues.length === 0) {
        return '';
      }
    } else if (typeof insertValues === 'object' && _.isEmpty(insertValues)) {
      return sql + this._emptyInsertValue;
    }

    var insertData = this._prepInsert(insertValues);
    if (typeof insertData === 'string') {
      sql += insertData;
    } else  {
      if (insertData.columns.length) {
        sql += '(' + this.formatter.columnize(insertData.columns) ;
        sql += ') values (';
        var i = -1;
        while (++i < insertData.values.length) {
          if (i !== 0) sql += '), (';
          sql += this.formatter.parameterize(insertData.values[i]);
        }
        sql += ')';
      } else if (insertValues.length === 1 && insertValues[0]) {
        sql += this._emptyInsertValue;
      } else {
        sql = '';
      }
    }
    return sql;
  },

  // Compiles the "update" query.
  update: function() {
    // Make sure tableName is processed by the formatter first.
    var tableName  = this.tableName;
    var updateData = this._prepUpdate(this.single.update);
    var wheres     = this.where();
    return 'update ' + tableName +
      ' set ' + updateData.join(', ') +
      (wheres ? ' ' + wheres : '');
  },

  // compiles columns to projection
  columns: function() {
    const columns = this.grouped.columns || [];
    const projection = {};

    columns.forEach(columnGroup =>
      columnGroup.value.forEach(column =>
        projection[column] = 1));

    return {projection};
  },


  limit: function() {
    var noLimit = !this.single.limit && this.single.limit !== 0;
    if (noLimit) return '';
    return 'limit ' + this.formatter.parameter(this.single.limit);
  },

  offset: function() {
    if (!this.single.offset) return '';
    return 'offset ' + this.formatter.parameter(this.single.offset);
  },

  // Compiles a `delete` query.
  del: function() {
    // Make sure tableName is processed by the formatter first.
    var tableName  = this.tableName;
    var wheres = this.where();
    return 'delete from ' + tableName +
      (wheres ? ' ' + wheres : '');
  },

  // Compile the "counter".
  counter: function() {
    var counter = this.single.counter;
    var toUpdate = {};
    toUpdate[counter.column] = this.client.raw(this.formatter.wrap(counter.column) +
      ' ' + (counter.symbol || '+') +
      ' ' + counter.amount);
    this.single.update = toUpdate;
    return this.update();
  },

  order: function () {
    return {
      sort: {}
    };
  },

  offset: function () {
    return {
      skip: 0
    };
  },

  limit: function () {
    return {
      limit: 0
    };
  },

  // Where Clause
  // ------

  where: function() {
    const wheres = this.grouped.where || [];
    const parts = [];
    let logicalBool = null;
    let selector = null;
 
    wheres.forEach((whereGroup, i) => {
      const {bool, type, column, operator, value} = whereGroup;

      if (i) {
        if (logicalBool && logicalBool !== bool) {
          throw new Error(`Ambiguous and/or WHERE clause`);
        }
        logicalBool = bool;
      }

      switch (type) {
        case 'whereBasic':
          parts.push({
            [column]: compileSubselector(operator, value)
          });

          break;
        default:
          throw new Error(`Unsupported where type '${type}'`);
      }
    });

    logicalBool = logicalBool || 'and';
    if (logicalBool === 'or') {
      selector = {
        $or: parts
      };
    } else if (logicalBool === 'and') {
      // { field: { $gt: [2, 3] , ...}, ... }
      const opsTable = {};
      const $and = [];

      // each part looks like { field: { $gt: 2, $lt: 1 } }
      parts.forEach((subsel) => {
        const subselKeys = Object.keys(subsel);
        subselKeys.forEach((key) => {
          if (key === '$and') {
            $and.push(...subsel[key]);
            return;
          }

          const table = (opsTable[key] = opsTable[key] || {});
          const ops = subsel[key];

          // each op looks $gt or $lt, etc
          Object.keys(ops).forEach((op) => {
            table[op] = table[op] || [];
            table[op].push(ops[op]);
          });
        });
      });

      // merge multiple rules on the same path
      // {x: {$gt: 2}} + {x: {$gt: 3}} -> {$and: [{x: ...}, {x: ...}]}
      selector = {};
      const keys = Object.keys(opsTable);

      keys.forEach((key) => {
        const table = opsTable[key];
        const subsel = (selector[key] = {});
        Object.keys(table).forEach((op) => {
          const pieces = table[op];
          if (pieces.length > 1) {
            $and.push(...pieces.map(piece => ({[key]: {[op]: piece}})));
          } else {
            subsel[op] = pieces[0];
          }
        });

        if (_.isEmpty(subsel)) {
          delete selector[key];
        }
      });

      if ($and.length > 0) {
        selector.$and = $and;
      }
    }

    return {selector};

    function compileSubselector(operator, value) {
      const table = {
        '=': '$eq',
        '<>': '$ne',
        '<': '$lt',
        '<=': '$lte',
        '>': '$gt',
        '>=': '$gte'
      };
      const op = table[operator];

      if (! op) throw new Error(`Unsupported comparison operator '${operator}'`);

      return { [op]: value };
    }
  },

  whereIn: function(statement) {
    if (Array.isArray(statement.column)) return this.multiWhereIn(statement);
    return this.formatter.wrap(statement.column) + ' ' + this._not(statement, 'in ') +
      this.wrap(this.formatter.parameterize(statement.value));
  },

  multiWhereIn: function(statement) {
    var i = -1, sql = '(' + this.formatter.columnize(statement.column) + ') ';
    sql += this._not(statement, 'in ') + '((';
    while (++i < statement.value.length) {
      if (i !== 0) sql += '),(';
      sql += this.formatter.parameterize(statement.value[i]);
    }
    return sql + '))';
  },

  whereNull: function(statement) {
    return this.formatter.wrap(statement.column) + ' is ' + this._not(statement, 'null');
  },

  // Compiles a basic "where" clause.
  whereBasic: function(statement) {
    return this._not(statement, '') +
      this.formatter.wrap(statement.column) + ' ' +
      this.formatter.operator(statement.operator) + ' ' +
      this.formatter.parameter(statement.value);
  },

  whereExists: function(statement) {
    return this._not(statement, 'exists') + ' (' + this.formatter.rawOrFn(statement.value) + ')';
  },

  whereWrapped: function(statement) {
    var val = this.formatter.rawOrFn(statement.value, 'where');
    return val && this._not(statement, '') + '(' + val.slice(6) + ')' || '';
  },

  whereBetween: function(statement) {
    return this.formatter.wrap(statement.column) + ' ' + this._not(statement, 'between') + ' ' +
      _.map(statement.value, this.formatter.parameter, this.formatter).join(' and ');
  },
  wrap: function(str) {
    if (str.charAt(0) !== '(') return '(' + str + ')';
    return str;
  },

  // Determines whether to add a "not" prefix to the where clause.
  _not: function(statement, str) {
    if (statement.not) return 'not ' + str;
    return str;
  }
});

QueryCompiler.prototype.first = QueryCompiler.prototype.select;

// Get the table name, wrapping it if necessary.
// Implemented as a property to prevent ordering issues as described in #704.
Object.defineProperty(QueryCompiler.prototype, 'tableName', {
  get: function() {
    if(!this._tableName) {
      // Only call this.formatter.wrap() the first time this property is accessed.
      this._tableName = this.single.table ? this.formatter.wrap(this.single.table) : '';
    }
    return this._tableName;
  }
});


Knex = knex;
