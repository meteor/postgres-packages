// This file compiles the 'bluebird' npm module for the browser that
// has a custom scheduler that always tries to finish non-async tasks
// synchronously before the call returns.
// This is important to be able to write a knex driver on top of
// Minimongo, since we know that all calls to Minimongo return
// synchronously.

var Promise = require("bluebird");
var callbackQueueStack = [];

Promise.setScheduler(function(callback) {
  if (callbackQueueStack.length > 0) {
    callbackQueueStack[callbackQueueStack.length - 1].push(callback);
  } else if (typeof process === "object" &&
             typeof process.nextTick === "function") {
    process.nextTick(callback);
  } else {
    Meteor.setTimeout(callback, 0);
  }
});

// use this function to wrap the methods that normally return a
// Promise and make it synchronous
Promise.synchronize = function(fn) {
  return function wrapper() {
    var queue = [];
    var gotResult = false;

    callbackQueueStack.push(queue);

    try {
      var result = fn.apply(this, arguments);
      if (Promise.is(result)) {
        result.done(function(value) {
          result = value;
          gotResult = true;
        });
      } else {
        gotResult = true;
      }
    } finally {
      for (var i = 0; i < queue.length; ++i) {
        try {
          (0, queue[i])();
        } finally {
          continue;
        }
      }
      callbackQueueStack.pop();
    }

    if (! gotResult) {
      throw new Error(
        "Promise.synchronize could not fulfill all promises synchronously"
      );
    }

    return result;
  };
};

window.__Sync_BlueBird = Promise;
