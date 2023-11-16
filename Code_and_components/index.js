const express = require('express');
const app = express();
const path = require("path");
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt'); //  To hash passwords
//const axios = require('axios');

// set the view engine to ejs
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'init_data')));

// set session
app.use(
  session({
    secret: "XASDASDA",
    saveUninitialized: true,
    resave: true,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// db config
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// db test
db.connect()
  .then((obj) => {
    // Can check the server version here (pg-promise v10.1.0+):
    console.log("Database connection successful");
    obj.done(); // success, release the connection;
  })
  .catch((error) => {
    console.log("ERROR:", error.message || error);
  });

  const user = {
    username: undefined,
    first_name: undefined,
    last_name: undefined,
  };

//---------------------------------------------------------------------------------------------------------------------

app.get('/welcome', (req, res) => {
    res.json({status: 'success', message: 'Welcome!'});
  });

app.get('/', (req, res) => {
  res.redirect('/login'); //this will call /login route in the API
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  try {

    const username = req.body.username;
    const user = await db.oneOrNone(`select * from users where username =  $1`, username);

    if (!user) {
      res.redirect('/register');
      return;
    }

    const match = await bcrypt.compare(req.body.password, user.password);
  
    if (match) {
      res.json({status: 'Success', message: 'Log in successful.'});
      req.session.user = user;
      req.session.save(() => {
        res.redirect('/home');
      });
    } else {
      throw new Error("Incorrect username or password.");
    }
  } catch (error) {
    res.json({status: 'Failure', message: 'Incorrect username or password.'});
    res.render('pages/login'); // cannot set headers after they are sent to the client
    return console.log(error);
  }
});

// app.get register functionality??

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
        res.json({status: 'Success', message: 'User successfully registered.'});
        res.redirect('/login');
      })
      // if query execution fails
      // send error message
      .catch(err => {
        res.json({status: 'Failure', message: 'Issues registering user.'});
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

var client_id = 'a8a051d3f78f420295c99fdc4d712ede';
var client_secret = 'e950fb4f69654075b05305d7aa871043'
var redirect_uri = 'http://localhost:3000/callback';
var spoitfy_linked = false;

app.get('/spotifylogin', function(req, res) {

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      redirect_uri: redirect_uri
    }));
});

app.get('/callback', function(req, res) {

  var code = req.query.code || null;

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
    },
    json: true
  };
  
  axios(authOptions).then(data => {
    access_token = data.access_token;
    localStorage.setItem('access_token',access_token);
    refresh_token = data.refresh_token;
    localStorage.setItem('refresh_token',refresh_token);
    spoitfy_linked = true;
    console.log(access_token);
  })
  .catch(error => {
    console.log(error);
  })
});

app.get('/refresh_token', function(req, res) {

  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
          refresh_token = body.refresh_token;
      res.send({
        'access_token': access_token,
        'refresh_token': refresh_token
      });
    }
  });
});

async function fetchWebApi(endpoint, method, body) {
  const res = await fetch(`https://api.spotify.com/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
    method,
    body:JSON.stringify(body)
  });
  return await res.json();
}

async function getTopTracks(){
  return (await fetchWebApi(
    'v1/me/top/tracks?time_range=short_term&limit=10', 'GET'
  )).items;
}

app.get('/refresh_token', async function(req, res) {
  const topTracks = await getTopTracks();
  console.log(
    topTracks?.map(
      ({name, artists}) =>
        `${name} by ${artists.map(artist => artist.name).join(', ')}`
    )
  );
})

app.get('/discover', async (req, res) => {
  const ticketmaster_api_key = "kUFeqGhN5NHBhB8Fafpu2jpS2gWPURt9"
  const query = `SELECT short_term_top_artists, medium_term_top_artists, long_term_top_artists FROM top_artists WHERE user_id = ${req.session.user.user_id}`
  const artists = await db.any(query);

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
          keyword: artists, //you can choose any artist/event here
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