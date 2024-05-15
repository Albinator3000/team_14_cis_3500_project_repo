const { getUserByUName, getUser } = require('./user.js');
//var pos = 0;

/* eslint-disable no-console */
const { ObjectId } = require('mongodb');
const { getDB } = require('./db');

/**
 * Add a new event to the events collection
 * @param {*} newEvent - new event to add
 * @returns
 */

const addEvent = async (newEvent) => {
  try {
    const db = await getDB();
    const result = await db.collection('events').insertOne(newEvent);
    console.log(`New event created with id: ${result.insertedId}`);
    console.log('* Note the the Event Name, Event Password, and position in Event Feed Queue cannot be altered *');
    return result.insertedId;
  } catch (err) {
    console.error(err);
    throw new Error('Could not add event');
  }
};

// /**
//   * GET/READ a user given their ID
//   * @param {*} userID - user id of a user
//   * @returns
//   */
// const getEventID = async (eventID) => {
//   try {
//     // get the db
//     const db = await getDB();
//     const result = await db.collection('events').findOne({ _id: new ObjectId(userID) });
//     // print the result
//     console.log(`User: ${JSON.stringify(result)}`);
//     return result;
//   } catch (err) {
//     console.error(err);
//     throw new Error('could not get the user');
//   }
// };

/**
* Update an event's information
* @param {*} eventID - the id of the event
* @param {*} eventName
* @param {*} eventQueuePos
* @param {*} eventParty
* @param {*} newEventPot
* @param {*} newEventBuyIn

* @returns
*/

const updateEventPot = async (eventID, NewEventPot) => {
  try {
    // get the db
    const db = await getDB();
    const result = await db.collection('events').updateOne(
      { _id: new ObjectId(eventID) },
      { $set: { eventPot: NewEventPot } }
    );
    const name = await db.collection('events').findOne(
      { _id: new ObjectId(eventID) }
    );
    console.log('event: ' + name.eventName + " -> pot amount is now: " + NewEventPot);
    return result;
  } catch (err) {
    const name = await db.collection('events').findOne(
      { _id: new ObjectId(eventID) }
    );
    console.error(err);
    throw new Error('could not update event '+ name.eventName +'  pot amount');
  }
};

/**
 * Retrieves comprehensive details for a specified event.
 * @param {ObjectId} eventID - The ID of the event.
 * @returns {Promise<Object>} A promise that resolves to an object containing full event details.
 */
const getEventDetails = async (eventID) => {
  try {
    const db = await getDB();
    const eventDetails = await db.collection('events').aggregate([
      { $match: { _id: new ObjectId(eventID) } },
      {
        $lookup: {
          from: "users", // Assuming there is a users collection for participant details
          localField: "eventParty.userID", // Adjust field according to your schema if needed
          foreignField: "_id",
          as: "participants"
        }
      },
      {
        $project: {
          eventName: 1,
          eventQueuePos: 1,
          eventPot: 1,
          eventBuyIn: 1,
          eventPassword: 1,
          participants: {
            $map: {
              input: "$participants",
              as: "participant",
              in: { username: "$$participant.username", email: "$$participant.email" } // Project only necessary fields
            }
          },
          totalParticipants: { $size: "$eventParty" },
          totalPot: "$eventPot",
          totalBuyIn: "$eventBuyIn"
        }
      }
    ]).toArray();

    return eventDetails.length > 0 ? eventDetails[0] : null;
  } catch (err) {
    console.error('Error retrieving event details:', err);
    throw new Error('Could not retrieve event details');
  }
};


const updateEventBuyIn = async (eventID, NewEventBuyIn) => {
  try {
    // get the db
    const db = await getDB();
    const result = await db.collection('events').updateOne(
      { _id: new ObjectId(eventID) },
      { $set: { eventBuyIn: NewEventBuyIn } }
    );
    const name = await db.collection('events').findOne(
      { _id: new ObjectId(eventID) }
    );
    console.log('event: ' + name.eventName + " -> buy-in amount is now: " + NewEventBuyIn);
    return result;
  } catch (err) {
    const name = await db.collection('events').findOne(
      { _id: new ObjectId(eventID) }
    );
    console.error(err);
    throw new Error('could not update event: '+ name.eventName +' buy-in amount');
  }
};

/**
 * Retrieves all events from the events collection.
 * @returns {Promise<Array>} A promise that resolves to an array of event objects.
 */
const getAllEvents = async () => {
  try {
    const db = await getDB();
    const events = await db.collection('events').find({}).toArray();
    return events;
  } catch (err) {
    console.error('Error retrieving all events:', err);
    throw new Error('Could not retrieve events');
  }
};


/**
 * Retrieves the buy-in amount for a specified event.
 * @param {ObjectId} eventID - The ID of the event.
 * @returns {Promise<number>} The buy-in amount of the event.
 */
const getBuyIn = async (eventID) => {
  try {
    const db = await getDB();
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventID) }, { projection: { eventBuyIn: 1 } });

    if (!event) {
      console.error('Event not found');
      throw new Error('Event not found');
    }

    console.log("Buy-in amount for event is " + event.eventBuyIn);
    return event.eventBuyIn;  // Make sure to return the buy-in amount
  } catch (err) {
    console.error('Error retrieving buy-in amount:', err);
    throw new Error('Could not retrieve buy-in amount');
  }
};



 /**
  * Retrieves the pot amount for a specified event.
  * @param {ObjectId} eventID - The ID of the event as a string
  * @returns {Promise<number>} The current pot amount of the event.
  */
const getEventPot = async (eventID) => {
  try {
    const db = await getDB();
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventID) });

    //console.log("Retrieved event data:", event);  // Log the entire event object

    if (!event) {
      console.error('Event not found');
      throw new Error('Event not found');
    }
    if (!event.eventPot) {
      console.error('Event pot not found on the document');
      throw new Error('Event pot not found on the document');
    }

    console.log("Pot amount for event is " + event.eventPot);
    return event.eventPot;
  } catch (err) {
    console.error('Error retrieving event pot:', err);
    throw new Error('Could not retrieve event pot');
  } 
};


const getEventParty = async (eventID) => {
  try {
    const db = await getDB();
    const result = await db.collection('events').findOne({
       _id: new ObjectId(eventID) });

    if (!result) {
      console.log('No event found with that ID');
      return null; // or you might throw an error or handle it differently
    }

    console.log('event: ' +  result.eventName + ` -> event party: ${JSON.stringify(result.eventParty)}`);
    return result.eventParty;  // Assuming the array of members is stored under 'eventParty'
  } catch (err) {
    console.error(err);
    throw new Error('Could not get the event');
  }
};

const addMemberToEventParty = async (eventID, username) => {
  try {
    const db = await getDB();
    const userID = await getUserByUName(username);  // Correctly await the user ID

    if (!userID) {
      console.log('User not found');
      return false;  // Exit if no user is found
    }

    const result = await db.collection('events').updateOne(
      { _id: new ObjectId(eventID) },
      { $push: { eventParty: { userID: userID } } }  // Push the userID within an object
    );

    //console.log(result);

    if (result.modifiedCount === 0) {
      console.log('No event was updated');
      return false;
    }

    console.log(`Member: ${username} with ID: ${userID} added to event party`);
    return true;
  } catch (err) {
    console.error(err);
    throw new Error('Could not add member to event party');
  }
};




// updateEventPot('66244efd47341d13c2561224', 1000);
// updateEventBuyIn('66244efd47341d13c2561224', 100);
// getEventParty('66244efd47341d13c2561224');


// addEvent({eventName: "POKER TOURNAMENT",
//           eventQueuePos: 1,
//           eventParty: [],
//           eventPot: 0,
//           eventBuyIn: 10,
//           eventPassword: "secretPassword123"});

addMemberToEventParty('664070d349b7a2e1df44c8e3', "ophera2");
addMemberToEventParty('664070d349b7a2e1df44c8e3', "lincolnn");
addMemberToEventParty('664070d349b7a2e1df44c8e3', "idaisugi");
addMemberToEventParty('664070d349b7a2e1df44c8e3', "seanwjc");
addMemberToEventParty('664070d349b7a2e1df44c8e3', "mhugues");
// //getEventParty('6625eb2cc0c7ab0142dbb360');
// getBuyIn('664070d349b7a2e1df44c8e3');
//getEventPot('664070d349b7a2e1df44c8e3');

// setTimeout(() => {
//   addMemberToEventParty('6625eb2cc0c7ab0142dbb360', "ophera2");
//   addMemberToEventParty('6625eb2cc0c7ab0142dbb360', "lincolnn");
//   addMemberToEventParty('6625eb2cc0c7ab0142dbb360', "idaisugi");
//   addMemberToEventParty('6625eb2cc0c7ab0142dbb360', "seanwjc");
//   addMemberToEventParty('6625eb2cc0c7ab0142dbb360', "mhugues");
   
// }, 200);

module.exports = {
  addEvent,
  updateEventPot,
  updateEventBuyIn,
  getEventParty,
  addMemberToEventParty,
  getBuyIn,
  getEventPot,
  getAllEvents,
  getEventDetails
};
