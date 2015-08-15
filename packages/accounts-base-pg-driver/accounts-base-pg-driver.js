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
    console.log("called getUserWhere", where);
    const userRow = PG.await(this.Users.model.where(where).fetch()).attributes;

    const createdAt = userRow.created_at;
    const _id = userRow.id;

    const fullUserDoc = {
      _id,
      createdAt
    };

    const serviceData = this._getServiceData(userRow.id);

    // accounts-password somehow needs to be able to register more fields to add
    // here, like emails and username
    // XXX but for now we hard-code it
    if (serviceData.password) {
      fullUserDoc.username = serviceData.password.username;
      delete serviceData.password;
    }

    fullUserDoc.services = serviceData;

    return fullUserDoc;
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

  // XXX should be in facebook package or something
  _getServiceData(userId) {
    const serviceDataRows = PG.await(this.Services.model.where({
      user_id: userId
    }).fetchAll());

    const serviceData = {};
    serviceDataRows.forEach((row) => {
      const serviceName = row.get("service_name");
      serviceData[serviceName] = serviceData[serviceName] || {};
      serviceData[serviceName][row.get("key")] = row.get("value");
    });

    return serviceData;
  }

  deleteAllResumeTokens() {
    PG.await(PG.knex("users_services").where({
      service_name: "resume.loginTokens"
    }).delete());
  }

  _getUserIdByServiceIdAndName(serviceName, serviceId) {
    const userRow = PG.await(PG.knex
      .first("users.*")
      .from("users")
      .leftJoin("users_services", "users.id", "users_services.user_id")
      .where({
        "users_services.key": "id",
        "users_services.value": serviceId,
        "users_services.service_name": serviceName
      }));

    return userRow && userRow.id;
  }

  getUserByServiceIdAndName(serviceName, serviceId) {
    const userId = this._getUserIdByServiceIdAndName(serviceName, serviceId);
    return userId && this.getUserById(userId);
  }

  // Insert a user, passing it in as a complete JSON blob...
  // XXX make sure that if transaction fails we know there was a problem
  insertUserDoc(fullUserDoc) {
    // Since we have a schema, we can't support any kind of field...
    check(fullUserDoc, {
      username: Match.Optional(String),
      services: Match.Optional(Object)
    });

    fullUserDoc.services = fullUserDoc.services || {};

    // accounts-password should really be a service, so we will move
    // username to a service field
    if (fullUserDoc.username) {
      fullUserDoc.services.password = {
        username: fullUserDoc.username
      };
    }

    let userId;
    PG.wrapWithTransaction(() => {
      userId = this.insertUser();

      Object.keys(fullUserDoc.services).forEach((serviceName) => {
        this.insertServiceRecords(
          serviceName,
          fullUserDoc.services[serviceName],
          userId
        );
      });
    })();

    return userId;
  }

  setServiceData(userId, serviceData) {
    // XXX THIS SHOULD BE AN UPSERT
    // but this is a spike so I am not implementing it - Sashko

    // PG.wrapWithTransaction(() => {
    //   Object.keys(serviceData).forEach((serviceName) => {
    //     this.insertServiceRecords(
    //       serviceName,
    //       serviceData[serviceName],
    //       userId
    //     );
    //   });
    // })();
  }

  insertServiceRecords(serviceName, serviceData, userId) {
    const serviceRecords = Object.keys(serviceData).map((key) => {
      const value = serviceData[key];

      // Currently, the schema assumes this is a string
      check(value, String);

      const record = {
        user_id: userId,
        service_name: serviceName,
        key,
        value
      };

      if (serviceName === "password" && key === "username") {
        record.id_if_not_unique = 0;
      }

      return record;
    });

    PG.wrapWithTransaction(() => {
      serviceRecords.forEach((record) => {
        try {
          PG.await(PG.knex("users_services").insert(record));
        } catch (error) {
          if (error.message.match(/duplicate key value/)) {
            throw new Error(`Key ${record.key} for login service ${serviceName} must be unique.`);
          } else {
            throw error;
          }
        }
      });
    })();
  }

  deleteUser(userId) {
    PG.await(PG.knex("users").where({id: userId}).delete());
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

    // We are going to put a random ID here if this value is not meant to be
    // unique across users
    table.integer("id_if_not_unique").defaultTo(PG.knex.raw("nextval('users_services_id_seq')"));
  }));

  // XXX POSTGRES
  PG.await(PG.knex.raw("ALTER TABLE users_services ADD CONSTRAINT skvi UNIQUE (service_name, key, value, id_if_not_unique);"));
};

AccountsDBClientPG.migrations.down = function () {
  PG.await(PG.knex.schema.dropTable("users"));
  PG.await(PG.knex.schema.dropTable("users_services"));
};
