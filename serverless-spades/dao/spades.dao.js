'use strict';
 
const AWS = require('aws-sdk'); 
const Deck = require('../model/deck');
const table = 'spades_decks';
AWS.config.setPromisesDependency(require('bluebird'));
AWS.config.update({region: 'us-east-1'});
const url = 'https://spades.bmclive.app';

const dynamoDb = new AWS.DynamoDB.DocumentClient();


const createDeck = (deck) => {
    const params = {
        TableName: table,
        Item: {
            id: deck.id,
            date_created: deck.date_created,
            last_used: deck.last_used,
            shuffled: deck.shuffled,
            stack: deck.stack,
            piles: deck.piles,
        }
    };
    
    return dynamoDb.put(params, (err) =>{
        if(err) {
          console.log(err)
          throw new Error("Database connection error");
        } else {
          console.log(`Successfully created new deck: ${deck.id} ${deck.date_created}`);
        }       
    }).promise()
  
  };

  module.exports = { createDeck }
// const d = new Deck()
// d.shuffle();
// d.deal();
// createDeck(d);

  