const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const session = require("express-session");


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

// set the view engine to ejs
app.set("view engine", "ejs");
app.use(bodyParser.json());

// set session
app.use(
  session({
    secret: "XASDASDA",
    saveUninitialized: true,
    resave: true,
  })
);

const user = {
  user_id: undefined,
  username: undefined,
  first_name: undefined,
  last_name: undefined,
};


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

app.post('/register', (req, res) => {
  // hash the password using bcrypt library

  //To-Do: Insert username and hashed password into 'users' table
  const add_user = `insert into users (username, password) values ($1, $2) returning * ;`; 

  db.task('add-user', task => {
    return task.batch([task.any(add_user, [req.body.username])]);
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


app.get('/discover', async (req, res) => {
  const ticketmaster_api_key = "kUFeqGhN5NHBhB8Fafpu2jpS2gWPURt9"
  const query = `SELECT short_term_top_artists, medium_term_top_artists, long_term_top_artists FROM top_artists WHERE user_id = ${req.session.user.user_id}`

  try{
    const response = await axios({
        url: `https://app.ticketmaster.com/discovery/v2/events.json`,
        method: 'GET',
        dataType: 'json',
        headers: {
          'Accept-Encoding': 'application/json',
        },
        params: {
          apikey: ticketmaster_api_key,
          keyword: "", //you can choose any artist/event here
          size: 20 // you can choose the number of events you would like to return
        },
      })
      const events = response.data._embedded.events;
      res.render('pages/discover', {events: events})
    }
    catch(error){
      console.error(err);
      res.render('pages/discover', {events: {} , error: 'failed'})
    }
  
});
module.exports = app.listen(3000);