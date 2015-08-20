Comments = new PG.Table("comments");

Posts = new PG.Table("posts", {
  modelClass: class Post extends PG.Model {
    comments() {
      return Comments.knex().where({post_id: this.id});
    }
  }
});

if (Meteor.isServer) {
  Meteor.publish("users-posts-and-their-comments", function() {
    const userId = this.userId;

    const postsQuery = Posts.knex()
      .select("posts.*")
      .innerJoin("users", "posts.user_id", "users.id");

    const commentsQuery = Comments.knex()
      .select("comments.*")
      .innerJoin("posts", "comments.post_id", "posts.id")
      .innerJoin("users", "posts.user_id", "users.id");

    return [
      postsQuery,
      commentsQuery
    ];
  });
} else {
  Meteor.subscribe("users-posts-and-their-comments");
}
