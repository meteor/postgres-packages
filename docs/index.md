# Use PostgreSQL with Meteor


## Concepts (read this before doing anything)

This is the simplest possible implementation of using a SQL database, specifically PostgreSQL, that we could come up with. The experience is not yet 100% seamless, and you have to put in some manual work for migrations, etc. Here are some core aspects to the design:

1. You can **publish any SQL query** from the server to the client using `Meteor.publish`. The data that ends up on the client is exactly the rows that are returned from the query. Read more here: [publishing data](publish.md)
1. You can only **run queries on the client** using the Knex query builder, which we have patched to enable specific query operators only. Read more here: [client-side queries](client.md)
1. For simple Meteor methods, you can **write your code once using Knex**, and you will get automatic optimistic UI. For complex methods, you will need to write separate code for the optimistic UI update, or just have your method run only on the server. Read more here: [methods](methods.md)
