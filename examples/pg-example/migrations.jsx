if (Meteor.isServer) {
  Migrations.add({
    version: 1,
    name: 'This is a test migration',
    up: function() {
      //code to migrate up to version 1
      console.log("going up to version 1 from 0")
    },
    down: function() {
      //code to migrate down to version 0
      console.log("going down to 0 from 1");
    }
  });

  Migrations.add({
    version: 2,
    name: 'This is a test migration',
    up: function() {
      //code to migrate up to version 1
      console.log("going up to version 2 from 1")
    },
    down: function() {
      //code to migrate down to version 0
      console.log("going down to 1 from 2");
    }
  });

  Migrations.add({
    version: 3,
    name: 'This is a test migration',
    up: function() {
      //code to migrate up to version 1
      console.log("going up to version 3 from 2")
    },
    down: function() {
      //code to migrate down to version 0
      console.log("going down to 2 from 3");
    }
  });

  Migrations.runIfEnvSet();
}
