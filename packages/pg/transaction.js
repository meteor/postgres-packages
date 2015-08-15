/**
 * Wrap a function in a transaction; rollback if error is thrown when it is called
 * @param  {Function} func function to run
 * @return {Object}   wrapped function
 */
PG.wrapWithTransaction = function wrapWithTransaction(func) {
  return function wrappedWithTransaction (/*args*/) {
    let ret;

    const transactionRun = new Promise((resolve, reject) => {
      PG.knex.transaction(Meteor.bindEnvironment((trx) => {
        console.log("inside transaction")
        try {
          ret = func.apply(this, arguments);
          trx.commit();
          resolve(ret);
        } catch (e) {
          trx.rollback();
          reject(e);
        }
      }));
    });

    console.log("after transaction");

    return Promise.await(transactionRun);
  };
};
