const express = require('express');
const app = express();
const path = require("path");
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios');
const { access } = require('fs');

process.on('warning', e => console.warn(e.stack));

// set the view engine to ejs
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use( express.static( "src" ) );
//app.use(express.static(path.join(__dirname, 'init_data')));

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

app.get('/discover', (req, res) => {
  res.render('pages/discover', {events: []});
});

app.get('/home', (req, res) => {
  res.render('pages/home');
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.get('/toptracks', (req, res) => {
  res.render('pages/toptracks', {songs: []});
});

app.get('/topartists', (req, res) => {
  res.render('pages/topartists', {artists: []});
});


app.get('/recommendations', (req, res) => {
  res.render('pages/recommendations', {tracks: []});
});

app.post("/login", async (req, res) => {
  try {

    const username = req.body.username;
    const find_user = await db.oneOrNone('select * from users where username =  $1', username);

    if (!find_user) {
      res.redirect('/register');
      return;
    }

    const match = await bcrypt.compare(req.body.password, find_user.password);
  
    if (match) {
      user.username = username;
      user.first_name = find_user.first_name;
      user.last_name = find_user.last_name;

      req.session.user = user;
      req.session.save(() => {
        console.log("Logging in...");
        res.redirect('/profile');
      });
    } else {
      throw new Error("Incorrect username or password.");
    }
  } catch (error) {
    res.render('pages/login', { error: "Incorrect username or password." });
    console.log("Incorrect username or password.");
  }
});

app.get('/register', (req, res) => {
  res.render('pages/register')
});

app.post('/register', async (req, res) => {
  /*
  const username = req.body.username;
  const find_user = await db.oneOrNone('select * from users where username =  $1', username);

    if (find_user) {
      res.redirect('/register');
      console.log("Username has already been used.")
      //#error-message
      document.querySelector("#error-message").textContent = "Username has already been taken"; //grabs the empty paragraph from register page
      return;
    }
    document.querySelector("#error-message").textContent = ""; //empties paragraph 
  */
    
    
  // hash the password using bcrypt library
  const hash = await bcrypt.hash(req.body.password, 10);

  //To-Do: Insert username and hashed password into 'users' table
  const add_user = `insert into users (username, password, first_name, last_name) values ($1, $2, $3, $4) returning * ;`;
 
  db.task('add-user', task => {
    return task.batch([task.any(add_user, [req.body.username, hash, req.body.first_name, req.body.last_name])]);
  })
    // if query execution succeeds, redirect to GET /login page
    // if query execution fails, redirect to GET /register route
    .then(data => {
      //res.status(200).json({status: 'Success', message: 'User successfully registered.'});
      res.redirect('/login');
    })
    // if query execution fails
    // send error message
    .catch(err => {
      //res.status(200).json({status: 'Failure', message: 'Issues registering user.'});
      console.log('Uh Oh spaghettio');
      console.log(err);
      res.redirect('/register');
    });
});

app.get('/profile', (req, res) => {
  res.render('pages/profile', {
    username: req.session.user.username,
    first_name: req.session.user.first_name,
    last_name: req.session.user.last_name,
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render("pages/login");
  res.render("pages/login", {
    message: `Logged out successfully.`,
  });
});

var client_id = 'a8a051d3f78f420295c99fdc4d712ede';
var client_secret = 'e950fb4f69654075b05305d7aa871043';
var redirect_uri = 'http://localhost:3000/callback';
var spotify_linked = false;
var access_token;

const AUTHORIZE = "https://accounts.spotify.com/authorize"

app.get('/spotifylogin', function(req, res) {

  let url = AUTHORIZE;
  url += "?client_id=" + client_id;
  url += "&response_type=code";
  url += "&redirect_uri=" + redirect_uri;
  url += "&show_dialog=true";
  url += "&scope=user-read-private user-read-email user-top-read";
  res.redirect(url); // Show Spotify's authorization screen
});

app.get('/callback', function(req, res) {

  const authConfig = {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
    }
  };

  var inputCode = req.query.code || null;

  axios.post(
      'https://accounts.spotify.com/api/token?',
      {
        grant_type: 'authorization_code',
        code: inputCode,
        redirect_uri: redirect_uri
      },
      authConfig,
  ).then(data => {
    //console.log(data)
    access_token = data.data.access_token;
    //refresh_token = data.refresh_token;
    //localStorage.setItem('refresh_token',refresh_token);
    spotify_linked = true;

    //fillTopArtists(access_token);

    res.redirect('/home');
  })
  .catch(error => {
    console.log(error);
  })
});

/*
async function fillTopArtists(accessToken) {

  let url = `https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=50`;

  const config = {
    headers: {
        Authorization: `Bearer ${accessToken}`,
      }
  };

  let topArtists;

  axios.get(
    url,
    config
    ).then(response => {
      console.log(response);
      //setTopArtists(response.data.items);
      topArtists = response.data.items;
      //console.log(topArtists);
      
      //setTopArtistsActivated(true);
  })
  .catch(error => {
    console.log(error);
  })

  const add_artists = `insert into top_artists (username) values ($1) returning * ;`;

  for (let artist of topArtists) {
    db.task('add-artists', task => {
      task.batch([task.any(add_artists, [artist.name])]);
    })
    .then(data => {
      res.redirect('/home');
    })
  
    .catch(err => {
      console.log('Uh Oh spaghettio');
      console.log(err);
      res.redirect('/register');
    });
  }

}
*/


app.get('/getTopTracks/:time_range', function(req, res) {
  let time_range = req.params.time_range;
  let url = `https://api.spotify.com/v1/me/top/tracks?time_range=${time_range}&limit=50`;

  const config = {
    headers: {
        Authorization: `Bearer ${access_token}`,
      }
  };

  axios.get(
    url,
    config
    ).then(response => {
      //setTopArtists(response.data.items);
      topTracks = response.data.items;
      console.log(topTracks[0].album.images);
      res.render('pages/toptracks', {songs: topTracks})
      
      //setTopArtistsActivated(true);
  })
  .catch(error => {
    console.log(error);
    res.render('pages/toptracks', {songs: []})
  })

});


app.get('/getTopArtists/:time_range', function(req, res) {
  let time_range = req.params.time_range;
  let url = `https://api.spotify.com/v1/me/top/artists?time_range=${time_range}&limit=50`;

  const config = {
    headers: {
        Authorization: `Bearer ${access_token}`,
      }
  };

  axios.get(
    url,
    config
    ).then(response => {
      //setTopArtists(response.data.items);
      topArtists = response.data.items;
      //console.log(topArtists);
      res.render('pages/topartists', {artists: topArtists})
      
      //setTopArtistsActivated(true);
  })
  .catch(error => {
    console.log(error);
    res.render('pages/topartists', {artists: []})
  })

});


  app.get('/discoverSearch', async (req, res) => {
    //const query = `SELECT long_term_top_artists FROM top_artists WHERE user_id = ${req.session.user.user_id}`
    //const artists = await db.any(query);
    //if (artists)
    //{
      const Location = req.query.Location

      if(req.query.discoverButton == "search") {
        const RefEvent = req.query.InputEvent
        events = await discoverEvents(Location, RefEvent)
        res.render('pages/discover', {events: events});
      } else if(req.query.discoverButton == "fill") {
        let url = `https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=20`;

        const config = {
          headers: {
              Authorization: `Bearer ${access_token}`,
            }
        };

        axios.get(
          url,
          config
          ).then(async response => {
            topArtists = response.data.items;
            
            let events = [];
            let artist;
            let event;
            for(let index in topArtists) {
              artist = topArtists[index].name
              event = await discoverEvents(Location,artist);
              if(event) {
                events = events.concat(event);
              }
            };
            //console.log(events);
            res.render('pages/discover', {events: events});
            
        })
      }
      
  });

  async function discoverEvents(Location, RefEvent) {
    try{
      const response = await axios({
          url: `https://app.ticketmaster.com/discovery/v2/events.json`,
          method: 'GET',
          dataType: 'json',
          headers: {
            'Accept-Encoding': 'application/json',
          },
          params: {
            apikey: process.env.TICKETMASTER_API_KEY,
            keyword: RefEvent, //you can choose any artist/event here
            city: Location,
            radius: 100,
            size: 2 // you can choose the number of events you would like to return
          },
        })
        console.log(response.data._embedded);
        if (response.data._embedded.events){
          return response.data._embedded.events;
        }
      }
      catch(error){
        console.error(error);
      }
  }
  


  
  //recommend api
  app.get('/searchSong', async (req, res) => {
    let input_song = req.query.InputSong
    let searchUrl = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${input_song}&api_key=${process.env.LAST_FM_API_KEY}&format=json`
    try{
      const response = await axios({url: searchUrl})
      const searchResults = response.data.results.trackmatches.track   
      res.render('pages/recommendations', {tracks: searchResults})
    }
    catch(error){
      console.error(error);
      res.render('pages/recommendations', {tracks: [],error: 'failed'})
    }
  });

app.post('/displayResults', async (req, res) => {
    let track = req.body.trackName
    let artist = req.body.trackArtist
    const url = `http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${artist}&track=${track}&api_key=${process.env.LAST_FM_API_KEY}&format=json`
    try{
       const response = await axios({url: url})
       const searchResults = response.data.similartracks.track   
       res.render('pages/recResults', {tracks: searchResults})
    }
    catch(error){
      console.error(error);
      res.render('pages/recResults', {tracks: [],error: 'failed'})
    }
    
});

//collage API

app.get('/collageTracks/:time_range', function(req, res) {
  let time_range = req.params.time_range;
  let url = `https://api.spotify.com/v1/me/top/tracks?time_range=${time_range}&limit=50`;

  const config = {
    headers: {
        Authorization: `Bearer ${access_token}`,
      }
  };

  axios.get(
    url,
    config
    ).then(response => {
      //setTopArtists(response.data.items);
      topTracks = response.data.items;
      console.log(topTracks[0].album.images);
      res.render('pages/collageTracks', {tracks: topTracks})
      
      //setTopArtistsActivated(true);
  })
  .catch(error => {
    console.log(error);
    res.render('pages/collageTracks', {tracks: []})
  })

});

app.get('/collageArtists/:time_range', function(req, res) {
  let time_range = req.params.time_range;
  let url = `https://api.spotify.com/v1/me/top/artists?time_range=${time_range}&limit=50`;

  const config = {
    headers: {
        Authorization: `Bearer ${access_token}`,
      }
  };

  axios.get(
    url,
    config
    ).then(response => {
      //setTopArtists(response.data.items);
      topArtists = response.data.items;
      console.log(topArtists[0].images);
      res.render('pages/collageArtists', {artists: topArtists})
      
      //setTopArtistsActivated(true);
  })
  .catch(error => {
    console.log(error);
    res.render('pages/collageArtists', {artists: []})
  })

});


// ---------------------------------------------------------------------------------------------------------
// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

app.use(auth);

module.exports = app.listen(3000);