if (Meteor.isClient) {
  var Things = new Mongo.Collection('things');
  Template.hello.helpers({
    posts: function () {
      return Things.find();
    },
    post: function () {
      return JSON.stringify(this, null, 2);
    }
  });

  Meteor.subscribe('mypub');
}

if (Meteor.isServer) {
  const Posts = new PG.Table("posts", (table) => {
    table.increments(); // id
    table.string("title");
  }, {
    comments() {
      return this.hasMany(Comments.model, "post_id");
    }
  });

  const Comments = new PG.Table("comments", (table) => {
    table.increments(); // id
    table.string("text");
    table.integer("post_id");
  }, {
    post() {
      return this.belongsTo(Posts.model, "post_id");
    }
  });

  Posts.model.where({}).fetch({withRelated: ["comments"]}).then((result) => {
    if (! result) {
      const post = new Posts.model({
        title: "This is the first post!"
      }).save();

      const comment = new Comments.model({
        text: "This is a comment on the post.",
        post_id: 1
      }).save();
    }
  });

  console.log()

  Meteor.publish('mypub', function () {
    return new PG.Query(
      PG.knex
        .select("posts.*",
          PG.knex.raw("array_to_json(array_agg(comments.*)) as comments"))
        .from("posts")
        .leftJoin("comments", "comments.post_id", "posts.id")
        .groupBy("posts.id")
        .toString(),
      'things');
  });


  // [
  //   'SELECT posts.*, array_to_json(array_agg(comments.*)) as comments',
  //   'FROM posts',
  //   'LEFT JOIN comments ON comments.post_id = posts.id',
  //   'GROUP BY posts.id'
  // ].join(' ')
}
