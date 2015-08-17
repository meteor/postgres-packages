Migrations.runIfEnvSet = function (envVar = "RUN_MIGRATIONS") {
  if (process.env[envVar]) {
    // Since we have transactions, we don't need to lock stuff
    Migrations._collection.update({_id:"control"}, {$set:{"locked":false}});

    // Run the migration
    Migrations.migrateTo(process.env.RUN_MIGRATIONS);
    console.log("=> Done running migrations. Kill your app manually and restart without the RUN_MIGRATIONS env var.");
    process.exit(0);
  } else {
    const lastMigrationVersion = _.last(Migrations._list).version;
    try {
      if (Migrations.getVersion() < lastMigrationVersion) {
        console.log(`=> You have some migrations that haven't been run yet.
     Most recent version run: ${lastMigrationVersion}.

     You should consider running migrations with the following command:
       ${envVar}=latest meteor`);
      }
    } catch (e) {}
  }
}
