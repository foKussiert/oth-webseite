# OTHer

OTHer ist ein kleines soziales Netzwerk nach dem Vorbild von Twitter. Ich habe es als Studienprojekt an der OTH Regensburg mit Node.js, Express, Pug und PostgreSQL gebaut.

Nutzer können sich registrieren, kurze Beiträge schreiben (hier heißen sie "Others"), anderen folgen und den Feed durchsuchen. Im Dashboard werden außerdem die fünf meistgenutzten Hashtags angezeigt.

## Funktionen

- Registrierung, Login und Logout über Sessions
- Beiträge schreiben und im Feed anzeigen, neueste zuerst
- Suche nach Beiträgen und Nutzernamen
- Trending Hashtags, die aus den Beiträgen gezählt werden
- Anderen Nutzern folgen und entfolgen
- Profilseite mit Bio, Followern und eigenen Beiträgen
- Profilbild hochladen
- Zwei Skripte, die Nutzer und Beiträge aus CSV-Dateien in die Datenbank importieren

## Technik

Das Backend läuft mit Node.js und Express, die Seiten werden mit Pug gerendert. Die Daten liegen in einer PostgreSQL-Datenbank, die über das Paket `pg` angesprochen wird. Alle Abfragen verwenden Platzhalter wie `$1` und `$2`, damit Eingaben nicht direkt im SQL landen.

Weitere Pakete: `express-session`, `express-fileupload`, `dotenv` und `csv-parse`. Die Icons kommen von Bootstrap Icons.

Die Datenbank besteht aus drei Tabellen:

- `users` (user_id, name, password, birthday, profile_pic, bio_text, created)
- `others` (post_id, user_id, text, created)
- `follows` (follower, followee)

## Starten

Man braucht Node.js und eine PostgreSQL-Datenbank.

```bash
npm install
```

Danach eine Datei `.env` anlegen. Als Vorlage dient `.env.example`:

```
PORT=3000
DATABASE_URL=postgres://benutzer:passwort@localhost:5432/other
SESSION_SECRET=ein-langer-zufaelliger-text
```

Testdaten importieren (optional) und Server starten:

```bash
node import.js
node importothers.js
node app.js
```

Die Seite ist dann unter `http://localhost:3000` erreichbar.

## Was noch fehlt

Es ist ein Lernprojekt, deshalb sind einige Dinge noch nicht so umgesetzt, wie man es in einer echten Anwendung machen würde. Die Passwörter werden im Klartext gespeichert, sie sollten eigentlich mit bcrypt gehasht werden. Beim Profilbild-Upload werden Dateiname und Dateityp nicht geprüft. 
