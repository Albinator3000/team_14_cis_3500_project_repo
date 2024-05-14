//give each user a certain amount of starter currency. everyone's currency amount and the event pot should be stored in an array.

//for all users in a given event, subtract the event buy-in from each user's currency amount and add it to the event pot

//pick a user to win the bet

//add the pot to the winning user's currency total

const { getUser, getUserByUName } = require('./user.js')
const { getBuyIn, getEventParty, getEventPot } = require('./event.js');
const { ObjectId } = require('mongodb');


const { getDB } = require('./db');

/**
 * Initializes user currency for all users. This should be called when initializing the syst em.
 * @returns {Promise<void>}
 */
const initializeUserCurrency = async () => {
  const db = await getDB();
  const users = await db.collection('users').find({}).toArray();
  const currencyInit = users.map(user => ({
    userID: user._id,
    currency: 1000 // Assign each user a starter currency of 1000 units.
  }));

  await db.collection('currency').insertMany(currencyInit);
  console.log('All users have been assigned starter currency.');
};

/**
 * Processes the buy-in for an event, deducting the buy-in amount from each user's currency and updating the event pot.
 * @param {ObjectId} eventID - The ID of the event
 * @returns {Promise<void>}
 */
// const processBuyIn = async (eventID) => {
//   const db = await getDB();
//   const event = await db.collection('events').findOne({ _id: eventID });
//   const buyIn = await getBuyIn(eventID);
//   console.log('Event Buy In: ' + buyIn);
//   const participants = await getEventParty(eventID);

//   const user = await getUserByUName(username);

//   console.log('Event Participants: ' + participants);

//   for (const participant of participants) {
//     await db.collection('currency').updateOne(
//       { userID:  participant.user },
//       { $inc: { currency: -buyIn } }
//     );
//   }

//   const totalBuyIn = buyIn * participants.length;
//   await db.collection('events').updateOne(
//     { _id: eventID },
//     { $inc: { pot: totalBuyIn } }
//   );

//   console.log(`Buy-in processed for event ${eventID}. Event pot is updated.`);
// };


const processBuyIn = async (eventID) => {
    const db = await getDB();
    const objectId = new ObjectId(eventID); // Ensure eventID is a proper ObjectId
    const event = await db.collection('events').findOne({ _id: objectId });
    if (!event) {
      throw new Error('Event not found');
    }
  
    const buyIn = await getBuyIn(objectId); // Ensure this returns a number
    //console.log(buyIn);
    const participants = await getEventParty(eventID); // Assuming this returns an array of participant IDs
  
    console.log(`Event Buy In: ${buyIn}`);
    console.log(`Event Participants: ${participants.length}`);
  
    for (const participant of participants) {
      await db.collection('currency').updateOne(
        { userID: participant.userID }, // Ensure participant.user is the correct identifier
        { $inc: { currency: -buyIn } }
      );
    }
  
    const totalBuyIn = buyIn * participants.length;
    await db.collection('events').updateOne(
      { _id: objectId },
      { $inc: { eventPot: totalBuyIn } }
    );
    console.log(`Buy-in processed for event ${eventID}. Event pot is updated by ${totalBuyIn}.`);
};

/**
 * Picks a winner randomly from an event and awards them the event pot.
 * @param {ObjectId} eventID - The ID of the event
 * @returns {Promise<void>}
 */
const awardWinner = async (eventID) => {
  const db = await getDB();
  const objectId = new ObjectId(eventID); // Ensure eventID is a proper ObjectId
  const event = await db.collection('events').findOne({ _id: objectId });

  if (!event) {
    throw new Error('Event not found');
  }
  
  const participants = await getEventParty(eventID);
  const winnerIndex = Math.floor(Math.random() * participants.length);
  console.log(winnerIndex);
  const winner2 = participants[winnerIndex].userID;


  
  const reward = await getEventPot(eventID);
  console.log(`Event Pot: ${reward}`);

  await db.collection('currency').updateOne(
    { userID: winner2},
    { $inc: { currency: reward} }
  );

  console.log(`Winner awarded. User ${winner2} wins ${reward} currency.`);
};

// Perform the initialization and update of the bet
(async () => {
    await initializeUserCurrency();
    await processBuyIn('664070d349b7a2e1df44c8e3');
    await awardWinner('664070d349b7a2e1df44c8e3');
  })();

module.exports = {
  initializeUserCurrency,
  processBuyIn,
  awardWinner,
};
