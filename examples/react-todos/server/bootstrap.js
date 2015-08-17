// if the database is empty on server start, create some sample data.
Meteor.startup(function () {
  if (PG.await(PG.knex("lists").count("*"))[0].count == 0) {
    var data = [
      {name: "Meteor Principles",
       items: ["Data on the Wire",
         "One Language",
         "Database Everywhere",
         "Latency Compensation",
         "Full Stack Reactivity",
         "Embrace the Ecosystem",
         "Simplicity Equals Productivity"
       ]
      },
      {name: "Languages",
       items: ["Lisp",
         "C",
         "C++",
         "Python",
         "Ruby",
         "JavaScript",
         "Scala",
         "Erlang",
         "6502 Assembly"
         ]
      },
      {name: "Favorite Scientists",
       items: ["Ada Lovelace",
         "Grace Hopper",
         "Marie Curie",
         "Carl Friedrich Gauss",
         "Nikola Tesla",
         "Claude Shannon"
       ]
      }
    ];

    var timestamp = (new Date()).getTime();

    _.each(data, function(list) {

      var list_id = PG.await(PG.knex("lists").insert({
        name: list.name
      }).returning("id"))[0];

      _.each(list.items, function(text) {
        PG.await(PG.knex("todos").insert({
          list_id: list_id,
          text: text,
          created_at: new Date(timestamp),
          checked: false
        }));

        timestamp += 1; // ensure unique timestamp.
      });
    });
  }
});
