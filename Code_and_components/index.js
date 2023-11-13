const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const axios = require('axios');

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

app.set('view engine', 'ejs'); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

//--------------------------------------------------------------------------------------------------------------------------------
// ENDPOINTS
app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
  });


app.get('/', (req, res) => {
  res.redirect('/login'); //this will call /login route in the API
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post("/login", async (req, res) => {
  try {

    const username = req.body.username;
    const user = await db.oneOrNone('select * from users where username =  $1', username);

    if (!user) {
      res.redirect('/register');
      return;
    }

    const match = await bcrypt.compare(req.body.password, user.password);
  
    if (match) {
      req.session.user = user;
      req.session.save(() => {
        res.redirect('/discover');
      });
    } else {
      throw new Error("Incorrect username or password.");
    }
  } catch (error) {
    res.render('pages/login', { error: "Incorrect username or password." });
  }
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.post('/register', async (req, res) => {
  // hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);

  //To-Do: Insert username and hashed password into 'users' table
  const add_user = `insert into users (username, password) values ($1, $2) returning * ;`; 

  db.task('add-user', task => {
    return task.batch([task.any(add_user, [req.body.username, hash])]);
  })
  // if query execution succeeds, redirect to GET /login page
  // if query execution fails, redirect to GET /register route
      .then(data => {
        res.redirect('/login');
      })
      // if query execution fails
      // send error message
      .catch(err => {
        console.log('Uh Oh spaghettio');
        console.log(err);
        res.redirect('/register');
      });
})

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render("pages/login");
  res.render("pages/login", {
    message: `Logged out successfully.`,
  });
})

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

app.use(auth)

module.exports = app.listen(3000);
console.log('Server is listening on port 3000');