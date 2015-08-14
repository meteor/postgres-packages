AccountsDBClientPG = class AccountsDBClientPG {
  constructor () {
    // This will throw an error saying we expect these tables to exist
    this.Users = new PG.Table("users");
    this.Services = new PG.Table("users_services");
  }

  insertUser() {
    const result = PG.await(this.Users.model.forge().save());
    return result.id;
  }

  getUserById(id) {
    return this._getUserWhere({id: id});
  }

  _getUserWhere(where) {
    const userRow = PG.await(this.Users.model.where(where).fetch()).attributes;

    const createdAt = userRow.created_at;
    const _id = userRow.id;

    // accounts-password somehow needs to be able to register more fields to add
    // here, like emails and username

    return {
      _id,
      createdAt
    };
  }

  _getResumeService(userId) {
    const loginTokens = PG.await(this.Services.where({
      user_id: userId,
      service_name: "resume.loginTokens"
    }).fetch());

    const formattedLoginTokens = loginTokens.map((loginToken) => {
      return {
        token: loginToken.value,
        when: loginToken.created_at.getTime()
      }
    });

    return {
      loginTokens: formattedLoginTokens
    }
  }
}

AccountsDBClientPG.migrations = {};

AccountsDBClientPG.migrations.up = function () {
  PG.await(PG.knex.schema.createTable("users", (table) => {
    table.increments(); // integer id

    // XXX POSTGRES
    table.timestamp("created_at").defaultTo(PG.knex.raw('now()'));
  }));

  PG.await(PG.knex.schema.createTable("users_services", (table) => {
    table.increments(); // integer id

    // XXX POSTGRES
    table.timestamp("created_at").defaultTo(PG.knex.raw('now()'));

    table.integer("user_id");

    table.string("service_name");
    table.string("key");
    table.string("value");
  }));
};

AccountsDBClientPG.migrations.down = function () {
  PG.await(PG.knex.schema.dropTable("users"));
  PG.await(PG.knex.schema.dropTable("users_services"));
};
