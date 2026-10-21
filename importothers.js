const fs = require("fs");
const parse = require("csv-parse");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const processFile = async () => {
  const parser = fs
    .createReadStream("others.csv")
    .pipe(parse.parse({ delimiter: ","}));

  for await (const record of parser) {
    const [post_id, user_id, text, created] = record;

    await pool.query(
      "INSERT INTO others (user_id, text, created) VALUES ($1, $2, $3)",
      [user_id, text, created]
    );
  }

  console.log("Others-Import abgeschlossen!");
};

processFile().catch(err => {
  console.error("Fehler beim Import:", err);
});
