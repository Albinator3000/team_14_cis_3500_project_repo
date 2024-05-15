/**
 * Express webserver / controller
 */

const { ObjectId } = require('mongodb');

// import express
const express = require('express');

// import the cors -cross origin resource sharing- module
const cors = require('cors');

// create a new express app
const webapp = express();

// import authentication functions
const { authenticateUser, verifyUser, blacklistJWT } = require('./auth');

// enable cors
webapp.use(cors());

webapp.use(express.json());

// configure express to parse request bodies
webapp.use(express.urlencoded({ extended: true }));

// import the db function
const dbLib = require('../model/user');

// Import the event handling functions
const eventLib = require('../model/event');

// Import queue.js is located under the model directory
const queueLib = require('../model/queue.js');

// Import currency.js is located under the model directory
const currencyLib = require('../model/currency.js');


// root endpoint route

webapp.get('/', (req, resp) => {
  resp.json({ message: 'CIS 3500 Betting App !!!' });
});

/**
 * Login endpoint POST /login
 * The name is used to log in
 */
webapp.post('/login', async (req, resp) => {
  // check that the name was sent in the body
  if (!req.body.username || req.body.username === '') {
    resp.status(401).json({ error: 'empty or missing username' });
    return;
  }
  if (!req.body.password || req.body.password === '') {
    resp.status(401).json({ error: 'empty or missing password' });
    return;
  }
  // authenticate the user
  try {
    const token = authenticateUser(req.body.username, req.body.password);

    const result = await dbLib.getUserByUName(req.body.username);

    resp.status(201).json({username:result.username, userId:result._id});

  } catch (err) {
    resp.status(400).json({ error: 'there was an error' });
  }
});

/**
   * Logout endpoint POST /logout
   * use JWT for authentication
   * Ends the session
   */
webapp.post('/logout', async (req, resp) => {
  // verify the session
  try {
    const authResp = await verifyUser(req.headers.authorization);
    if (authResp === 1) { // expired session
      resp.status(403).json({ message: 'Session expired already' });
      return;
    }
    if (authResp === 2 || authResp === 3) { // invalid user or jwt
      resp.status(401).json({ message: 'Invalid user or session' });
      return;
    }
    // session valid blacklist the JWT
    blacklistJWT(req.headers.authorization);
    resp.status(200).json({ message: 'Session terminated' });
  } catch (err) {
    resp.status(400).json({ message: 'There was an error' });
  }
});

/**
 * route implementations POST /register
 */
webapp.post('/register', async (req, resp) => {
  // parse the body
  if (!req.body.name || !req.body.email || !req.body.password) {
    resp.status(404).json({ message: 'missing name, email, or password in the body' });
    return;
  }
  try {
    const registerUser = {
      username: req.body.name,
      email: req.body.email,
      password: req.body.password,
    };
    const result = await dbLib.addUser(registerUser);
    resp.status(201).json({ data: { id: result } });
  } catch (error) {
    resp.status(400).json({ message: 'there was an error' });
  }
});

/**
 * route implementation GET /users
 */
webapp.get('/users', async (req, resp) => {
  try {
    // get the data from the database
    const users = await dbLib.getAllUsers();
    // send response
    resp.status(200).json({ data: users });
  } catch (error) {
    // send error code
    resp.status(400).json({ message: 'There was an error' });
  }
});

/**
 * route implementation GET /user/:id
 */
webapp.get('/user/:id', async (req, res) => {
  try {
    // get the data from the db
    const result = await dbLib.getUser(req.params.id);
    if (result === undefined) {
      res.status(404).json({ error: 'unknown user' });
      return;
    }
    // send the response with the appropriate status code
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(400).json({ message: 'there was error' });
  }
});

/**
 * route implementations POST /user
 */
webapp.post('/user', async (req, resp) => {
  // parse the body
  if (!req.body.name || !req.body.email || !req.body.password) {
    resp.status(404).json({ message: 'missing name, email, or password in the body' });
    return;
  }
  try {
    const newUser = {
      username: req.body.name,
      email: req.body.email,
      password: req.body.password,
    };
    const result = await dbLib.addUser(newUser);
    resp.status(201).json({ data: { id: result } });
  } catch (error) {
    resp.status(400).json({ message: 'there was an error' });
  }
});

/**
 * route implementation DELETE /user/:id
 */
webapp.delete('/user/:id', async (req, res) => {
  try {
    const result = await dbLib.deleteUser(req.params.id);
    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'user not in the system' });
      return;
    }
    // send the response with the appropriate status code
    res.status(200).json({ message: result });
  } catch (err) {
    res.status(400).json({ message: 'there was error' });
  }
});

/**
   * route implementation PUT /user/:id
   */
webapp.put('/user/:id', async (req, res) => {
  // parse the body of the request
  if (!req.body.password) {
    res.status(404).json({ message: 'missing password' });
    return;
  }
  try {
    const result = await dbLib.updateUser(req.params.id, req.body.password);
    // send the response with the appropriate status code
    res.status(200).json({ message: result });
  } catch (err) {
    res.status(400).json({ message: 'there was error' });
  }
});


/**
 * POST endpoint to add a new event
 */
webapp.post('/event', async (req, res) => {
  const { eventName, eventQueuePos, eventParty, eventPot, eventBuyIn, eventPassword } = req.body;
  console.log(req.body);
  
  try {
    const newEvent = {
      eventName: eventName,
      eventQueuePos: eventQueuePos,
      eventParty: eventParty,
      eventPot: eventPot,
      eventBuyIn: eventBuyIn,
      eventPassword: eventPassword
    };
    const result = await eventLib.addEvent(newEvent);
    res.status(200).json({ data: { id: result } });
  } catch (error) {
    res.status(400).json({ message: 'There was an error processing your request' });
  }
});

/**
 * PUT endpoint to update event pot
 * route implementation PUT /event/:id
 */
webapp.put('/event/:id', async (req, res) => {
  const { NewEventPot} = req.body;
  if (!NewEventPot) {
    res.status(400).json({ message: 'Missing new pot amount' });
    return;
  }

  try {
    const eventID = req.params.id; // Get event ID from URL parameter
    const eventName = "Retrieve event name if needed or modify function to avoid needing it"; // Placeholder, ideally should fetch or not needed
    const result = await eventLib.updateEventPot(eventID, NewEventPot);

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: 'No event was updated' });
    } else {
      res.status(200).json({
        message: `Event pot updated to ${NewEventPot}`
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'There was an error updating the event' });
  }
});

/**
 * PUT endpoint to update event buy-in
 * route implementation PUT /event/:id
 */
webapp.put('/event/:id', async (req, res) => {
  const { NewEventBuyIn} = req.body;
  if (!NewEventBuyIn) {
    res.status(400).json({ message: 'Missing new buy-in amount' });
    return;
  }

  try {
    const eventID = req.params.id; // Get event ID from URL parameter
    const eventName = "Retrieve event name if needed or modify function to avoid needing it"; // Placeholder, ideally should fetch or not needed
    const result = await eventLib.updateEventPot(eventID, NewEventBuyIn);

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: 'No event was updated' });
    } else {
      res.status(200).json({
        message: `Event pot updated to ${NewEventBuyIn}`
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'There was an error updating the event' });
  }
});

/**
 * GET endpoint to retrieve the buy-in amount for a specific event.
 * route implementation GET /event/:id/buy-in
 */
webapp.get('/event/:id/buy-in', async (req, res) => {
  const eventID = req.params.id;
  if (!ObjectId.isValid(eventID)) {
    return res.status(400).json({ message: 'Invalid event ID format' });
  }

  try {
    const buyIn = await eventLib.getBuyIn(new ObjectId(eventID));
    res.status(200).json({ buyIn: buyIn });
  } catch (error) {
    res.status(500).json({ message: 'There was an error retrieving the buy-in amount', error: error.message });
  }
});

/**
 * GET endpoint to retrieve the pot amount for a specific event.
 * route implementation GET /event/:id/pot
 */
webapp.get('/event/:id/pot', async (req, res) => {
  const eventID = req.params.id;
  if (!ObjectId.isValid(eventID)) {
    return res.status(400).json({ message: 'Invalid event ID format' });
  }

  try {
    const potAmount = await eventLib.getEventPot(new ObjectId(eventID));
    res.status(200).json({ potAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'There was an error retrieving the pot amount', error: error.message });
  }
});

webapp.get('/event/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const eventDetails = await eventLib.getEventDetails(id);
    if (!eventDetails) {
      res.status(404).json({ message: 'Event not found' });
    } else {
      res.status(200).json(eventDetails);
    }
  } catch (error) {
    console.error('Error retrieving event details:', error);
    res.status(500).json({ message: 'There was an error processing your request', error: error.message });
  }
});



/**
 * Route implementation GET /event/:id/party
 * This route retrieves the party members associated with a specific event.
 */
webapp.get('/event/:id/party', async (req, res) => {
  const eventID = req.params.id;
  if (!ObjectId.isValid(eventID)) {
    return res.status(400).json({ message: 'Invalid event ID format' });
  }

  try {
    const party = await eventLib.getEventParty(eventID);
    if (party === null) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    res.status(200).json({ eventParty: party });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'There was an error processing your request' });
  }
});


/**
 * Route implementation GET /event/:id/add-member
 * This route updates the party members associated with a specific event, specifically adding a new member to a bet.
 */

webapp.put('/event/:id/add-member', async (req, res) => {
  const { username } = req.body;
  const { id: eventID } = req.params;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    const success = await eventLib.addMemberToEventParty(eventID, username);
    if (!success) {
      res.status(404).json({ message: 'No user found or no event updated' });
    } else {
      res.status(200).json({ message: `User ${username} added to event party successfully` });
    }
  } catch (error) {
    res.status(500).json({ message: 'There was an error processing your request' });
  }
});

/**
 * Initialize Event Queue
 * POST /init-queue
 * This endpoint will initialize an empty event queue.
 */
webapp.post('/init-queue', async (req, res) => {
  try {
    const result = await queueLib.initializeEventQueue();
    if (result.message) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(201).json({ message: 'Queue initialized', data: result });
    }
  } catch (error) {
    res.status(500).json({ message: 'There was an error initializing the event queue', error: error.message });
  }
});

/**
 * Update Event Queue
 * POST /update-queue
 * This endpoint will update the current event queue with the latest events.
 */
webapp.post('/update-queue', async (req, res) => {
  try {
    const result = await queueLib.updateEventQueue();
    res.status(200).json({ message: 'Event queue updated', data: result });
  } catch (error) {
    res.status(500).json({ message: 'There was an error updating the event queue', error: error.message });
  }
});

// Initialize user currency
webapp.post('/init-currency', async (req, res) => {
  try {
    await currencyLib.initializeUserCurrency();
    res.status(200).json({ message: 'All users have been assigned starter currency.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to initialize user currency', error: error.message });
  }
});

/**
 * GET endpoint to retrieve all events
 */
webapp.get('/events', async (req, res) => {
  try {
      const events = await eventLib.getAllEvents();
      res.status(200).json({ events });
  } catch (error) {
      console.error('Error retrieving all events:', error);
      res.status(500).json({ message: 'There was an error retrieving the events', error: error.message });
  }
});


// Process buy-in for an event
webapp.post('/process-buyin', async (req, res) => {
  const { eventID } = req.body;
  if (!eventID || !ObjectId.isValid(eventID)) {
    res.status(400).json({ message: 'Invalid or missing event ID' });
    return;
  }
  
  try {
    await currencyLib.processBuyIn(new ObjectId(eventID));
    res.status(200).json({ message: 'Buy-in processed and event pot updated.' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing buy-in', error: error.message });
  }
});

// Award the winner of an event
webapp.post('/award-winner', async (req, res) => {
  const { eventID } = req.body;
  if (!eventID || !ObjectId.isValid(eventID)) {
    res.status(400).json({ message: 'Invalid or missing event ID' });
    return;
  }
  
  try {
    await currencyLib.awardWinner(new ObjectId(eventID));
    res.status(200).json({ message: 'Winner has been awarded the event pot.' });
  } catch (error) {
    res.status(500).json({ message: 'Error awarding event winner', error: error.message });
  }
});


// export the webapp
module.exports = webapp;
