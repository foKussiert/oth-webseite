const express = require("express");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const session = require("express-session");
const fileUpload = require("express-fileupload");


/* Reading global variables from config file */
dotenv.config();
const PORT = process.env.PORT;


app = express();
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
const pool = new Pool({ connectionString: process.env.DATABASE_URL, });

app.use(express.static("public"));
app.use(session
  ({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }));

app.set("views", "views");
app.set("view engine", "pug");
app.get("/", async (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  try {

    const result = await pool.query(`
      SELECT others.text, others.created, users.name, users.profile_pic
      FROM others
      JOIN users ON others.user_id = users.user_id
      ORDER BY others.created DESC
    `);

    const others = result.rows.map(o => {
      const date = new Date(o.created);
      return {
        ...o,
        //  ist das gleiche wie aber setzt sie halt anhand der db spaltennamen
        //  text: o.text,
        //  name: o.name,
        //  profile_pic: o.profile_pic,
        created: date.toLocaleDateString("de-DE") + " um " + date.toLocaleTimeString("de-DE",
          {
            hour: "2-digit",
            minute: "2-digit",
          }),
      };
    });

    res.render("landing", { others });
  }
  catch (err) {
    console.error("Fehler beim Laden der Landingpage:", err);
    res.status(500).send("Fehler beim Laden der Landingpage.");
  }
});

app.get('/dashboard', async (req, res) => {
  try {
    const search = req.query.search || "";
    const result = await pool.query(
      `SELECT others.text, others.created, users.name, users.profile_pic
      FROM others
      JOIN users ON others.user_id = users.user_id
      WHERE others.text ILIKE $1 OR users.name ILIKE $1
      ORDER BY others.created DESC`,
      [`%${search}%`]
    );

    const tagCount = {};
    const others = result.rows.map(o => 
    {
      const words = o.text.split(" ");
      const unwantedChars = [",", ".", "!", "?", ":", ";"];

      for (let word of words) 
      {
        if (word.startsWith("#") && word.length > 1)
        {
          let cleaned = word;

          while (unwantedChars.includes(cleaned.slice(-1))) {
            cleaned = cleaned.slice(0, -1);
          }

          cleaned = cleaned.toLowerCase();
          tagCount[cleaned] = (tagCount[cleaned] || 0) + 1;
        }
      }
      const date = new Date(o.created);
      return {
        ...o,
        created: date.toLocaleDateString("de-DE") + " um " + date.toLocaleTimeString("de-DE", 
        {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });

    const trending = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    res.render("dashboard", { others, search, trending, sessionUser: req.session.user });

  } catch (err) {
    console.error(err);
    res.status(500).send("Fehler beim Laden des Dashboards");
  }
});

app.get("/users", async (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  const searchQuery = req.query.query || "";
  const currentUserId = req.session.user.id;

  try {
    const result = await pool.query(
      `SELECT user_id, name, profile_pic,
              EXISTS (
                SELECT 1 FROM follows
                WHERE follower = $1 AND followee = users.user_id
              ) AS is_following
       FROM users
       WHERE user_id != $1 AND name ILIKE $2
       ORDER BY name ASC`,
      [currentUserId, `%${searchQuery}%`]
    );

    res.render("users", { users: result.rows });
  } catch (err) {
    console.error("Fehler beim Abrufen der Nutzer:", err);
    res.status(500).send("Fehler beim Laden der Nutzer.");
  }
});

app.get("/profile", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    const userId = req.session.user.id;
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM others WHERE user_id = $1",
      [userId]
    );
    const followerResult = await pool.query(
      "SELECT COUNT(*) FROM follows WHERE followee = $1",
      [userId]
    );
    const followerCount = parseInt(followerResult.rows[0].count);
    const followeeResult = await pool.query
      (
        "SELECT COUNT(*) FROM follows WHERE follower = $1",
        [userId]
      );
    const followeeCount = parseInt(followeeResult.rows[0].count);
    const otherCount = parseInt(countResult.rows[0].count);
    const userResult = await pool.query(
      "SELECT name, birthday, profile_pic, bio_text, created FROM users WHERE user_id = $1",
      [userId]
    );

    const user = userResult.rows[0];
    const postResult = await pool.query(
      "SELECT text, created FROM others WHERE user_id = $1 ORDER BY created DESC",
      [userId]
    );

    const posts = postResult.rows.map(p => {
      const date = new Date(p.created);
      return {
        ...p,
        created: date.toLocaleDateString("de-DE") + " um " + date.toLocaleTimeString("de-DE",
          {
            hour: "2-digit",
            minute: "2-digit",
          }),
      };
    });
    res.render("profile", { user, posts, otherCount, followerCount, followeeCount });
  }
  catch (err) {
    console.error("Fehler beim Laden des Profils:", err);
    res.status(500).send("Fehler beim Laden der Profilseite.");
  }
});
const path = require("path");

app.post("/profile/pic", async (req, res) => {
  if (!req.session.user || !req.files || !req.files.avatar) {
    return res.status(400).send("Kein Bild hochgeladen oder nicht eingeloggt.");
  }

  const avatar = req.files.avatar;
  const nameWithoutExtension = path.parse(originalName).name;

  const uploadPath = path.join(__dirname, "public", "img", "users", originalName);

  avatar.mv(uploadPath, async (err) => {
    if (err) return res.status(500).send("Fehler beim Hochladen.");
    await pool.query("UPDATE users SET profile_pic = $1 WHERE user_id = $2", [
      nameWithoutExtension,
      req.session.user.id,
    ]);

    req.session.user.profile_pic = nameWithoutExtension;

    res.redirect("/profile");
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});
app.post("/login", async (req, res) => {
  const { name, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE name = $1", [name]);

    if (result.rows.length === 0) {
      return res.status(401).send("Benutzer nicht gefunden.");
    }

    const user = result.rows[0];

    if (user.password !== password) {
      return res.status(401).send("Falsches Passwort.");
    }

    req.session.user =
    {
      id: user.user_id,
      name: user.name,
    };

    res.redirect("/dashboard");
  }
  catch (err) {
    console.error("Fehler beim Login:", err);
    res.status(500).send("Interner Fehler beim Login.");
  }
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.post("/register", async (req, res) => {
  const { name, password, birthday, profile_pic, bio_text } = req.body;

  try {
    const created = new Date();

    await pool.query(
      "INSERT INTO users (name, password, birthday, profile_pic, bio_text, created) VALUES ($1, $2, $3, $4, $5, $6)",
      [name, password, birthday, profile_pic, bio_text, created]
    );

    res.redirect("/login");
  }
  catch (err) {
    console.error("Fehler bei der Registrierung:", err);
    res.status(500).send("Registrierung fehlgeschlagen.");
  }
});
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Fehler beim Logout:", err);
      return res.status(500).send("Logout fehlgeschlagen.");
    }
    res.redirect("/");
  });
});
app.get("/other", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("other");
});
app.post("/other", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const userId = req.session.user.id;
  const text = (req.body.text || "").trim();

  if (text.length === 0) {
    return res.status(400).send("Leerer Post nicht erlaubt.");
  }
  const created = new Date();

  try {
    await pool.query(
      "INSERT INTO others (user_id, text, created) VALUES ($1, $2, $3)",
      [userId, text, created]
    );
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Fehler beim Erstellen des Others:", err);
    res.status(500).send("Fehler beim Erstellen des Others.");
  }
});
app.post("/follow/:id", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const followerId = req.session.user.id;
  const followeeId = parseInt(req.params.id);

  if (followerId === followeeId) {
    return res.redirect("/users");
  }

  try {
    await pool.query(
      "INSERT INTO follows (follower, followee) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [followerId, followeeId]
    );
    res.redirect("/users");
  } catch (err) {
    console.error("Fehler beim Folgen:", err);
    res.status(500).send("Fehler beim Folgen.");
  }
});
app.post("/unfollow/:id", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const followerId = req.session.user.id;
  const followeeId = parseInt(req.params.id);

  try {
    await pool.query(
      "DELETE FROM follows WHERE follower = $1 AND followee = $2",
      [followerId, followeeId]
    );
    res.redirect("/users");
  } catch (err) {
    console.error("Fehler beim Entfolgen:", err);
    res.status(500).send("Fehler beim Entfolgen.");
  }
});


app.listen(PORT, function () {
  console.log(`OTHer running and listening on port ${PORT}`);
});
