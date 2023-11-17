// Imports the index.js file to be tested.
const server = require('../index'); //TO-DO Make sure the path to your index.js is correctly added
//changed from ../src/resources/index
// Importing libraries

// Chai HTTP provides an interface for live integration testing of the API's.
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });

  // ===========================================================================
  // TO-DO: Part A Login unit test case
//Positive cases - checking the login API by passing in a valid user and checking that a redirect occurred
it('positive : /login', done => {
  chai
    .request(server)
    .post('/login')
    .send({ username: 'mfalconer7', password: 'mlavrinov7', first_name: 'Milli', last_name: 'La Plaine-Saint-Denis' })
    .redirects(0)
    .end((err, res) => {
      res.should.have.status(200);
      done();
    });
});
});

//Negative case - checking the login API by passing an invalid user and asserting that the error messages are equal
it('Negative : /login. Checking invalid name', done => {
  chai
    .request(server)
    .post('/login')
    .send({username: 'mfalconer7', password: 1234, first_name: 'Milli', last_name: 'La Plaine-Saint-Denis'})
    .end((err, res) => {
      //fix status number
      expect(res).to.have.status(200);
      expect(error).to.throw('Incorrect username or password.');
      done();
    });
});

//Positive register case - testing that a user can successfully register and is redirected to the /login page
it('positive : /register', done => {
  chai
    .request(server)
    .post('/register')
    .send({ username: 'username', password: 'password1234', first_name: 'Jane', last_name: 'Doe' })
    .redirects(0)
    .end((err, res) => {
      expect(res).to.have.status(200);
      done();
    });
});

//Negative register case - testing that an invalid username (longer than is allowed) cannot register
it('Negative : /register', done => {
  chai
    .request(server)
    .post('/register')
    .send({username: 'usernameusernameusernameusernameusernameusernameusernameusernameusernameusername', password: 'password', first_name: 'John', last_name: 'Doe'})
    .end((err, res) => {
      //fix status number
      expect(res).to.have.status(200);
      expect(err).to.throw('Uh Oh spaghettio');
      done();
    });
});