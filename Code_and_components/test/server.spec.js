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
//We are checking POST /add_user API by passing the user info in the correct order. This test case should pass and return a status 200 along with a "Success" message.
//Positive cases
it('positive : /login. Checking valid user', done => {
  chai
    .request(server)
    .post('/login')
    .send({username: 'randreassen9', first_name: 'Redford', last_name: 'Lunel'})
    .end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.status).to.equals('Success');
      expect(res.body.message).to.equals('Log in successful.');
      done();
    });
});
});

//We are checking POST /add_user API by passing the user info in in incorrect manner (name cannot be an integer). This test case should pass and return a status 200 along with a "Invalid input" message.
it('Negative : /login. Checking invalid name', done => {
  chai
    .request(server)
    .post('/login')
    .send({username: 'mfalcon', password: 1234})
    .end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.status).to.equals('Failure');
      expect(res.body.message).to.equals('Incorrect username or password.');
      done();
    });
});

//Positive register case
it('positive : /register', done => {
  chai
    .request(server)
    .post('/register')
    .send({username: 'username', password: 'password1234', first_name: 'Jane', last_name: 'Doe'})
    .end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.status).to.equals('Success');
      expect(res.body.message).to.equals('User successfully registered.');
      done();
    });
});

//Negative register case
//We are checking POST /add_user API by passing the user info in in incorrect manner (name cannot be an integer). This test case should pass and return a status 200 along with a "Invalid input" message.
it('Negative : /register', done => {
  chai
    .request(server)
    .post('/register')
    .send({username: 'usernameusernameusernameusernameusernameusernameusernameusernameusernameusername', password: 'password', first_name: 'John', last_name: 'Doe'})
    .end((err, res) => {
      //fix status number
      expect(res).to.have.status(200);
      expect(res.body.status).to.equals('Failure');
      expect(res.body.message).to.equals('Issues registering user.');
      done();
    });
});