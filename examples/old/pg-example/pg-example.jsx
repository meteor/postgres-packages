if (Meteor.isClient) {
  Things = new Mongo.Collection('things');
  Template.posts.helpers({
    posts: function () {
      return Things.find();
    }
  });

  Comments = new Mongo.Collection('comments');
  Template.allComments.helpers({
    comments: function () {
      return Comments.find();
    },
    formSchema: function () {
      return Schema.newComment;
    }
  });

  Meteor.subscribe('mypub');
  Meteor.subscribe('all-comments');
}

if (Meteor.isServer) {
  Posts = new PG.Table("posts", {
    comments() {
      return this.hasMany(Comments.model, "post_id");
    }
  });

  Comments = new PG.Table("comments", {
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

  Meteor.publish('all-comments', function (startingFrom) {
    return Comments.model.where('id', '>', startingFrom || 0);
    // also works with pure knex
    // return PG.knex.table('comments').where('id', '>', startingFrom || 0);
  });


  // [
  //   'SELECT posts.*, array_to_json(array_agg(comments.*)) as comments',
  //   'FROM posts',
  //   'LEFT JOIN comments ON comments.post_id = posts.id',
  //   'GROUP BY posts.id'
  // ].join(' ')
}

Schema = {};
Schema.newComment = new SimpleSchema({
  text: {
    type: String,
    label: "Comment text",
    max: 50
  },
  forPost: {
    type: Number,
    label: "Id of post this comment belongs to"
  }
});

Meteor.methods({
  addComment(args) {
    check(args, Schema.newComment);

    const {text, forPost} = args;

    const doc = {
      text,
      post_id: forPost
    };

    if (this.isSimulation) {
      // we don't have latency compensation yet
      return;
      Comments.insert(doc);
    } else {
      PG.await(Comments.model.forge(doc).save());
    }
  }
});
