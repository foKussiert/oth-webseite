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
    .createReadStream("users.csv") 
    .pipe(parse.parse({ delimiter: ","}));

  for await (const record of parser) {
    const [,name, password, birthday, profile_pic, bio_text, created] = record;

    await pool.query(
      "INSERT INTO users (name, password, birthday, profile_pic, bio_text, created) VALUES ($1, $2, $3, $4, $5, $6)",
      [name, password, birthday, profile_pic, bio_text, created]
    );
  }

  console.log("Import abgeschlossen!");
};

processFile().catch(err => {
  console.error("Fehler beim Import:", err);
});
