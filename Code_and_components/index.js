const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require("body-parser");
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


// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

// Authentication Required
app.use(auth);

app.get('/discover', async (req, res) => {
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


//recommend api
app.get('/recommend', async (req, res) => {
  
  
});


module.exports = app.listen(3000);