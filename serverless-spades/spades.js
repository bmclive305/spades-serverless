'use strict';

const AWS = require('aws-sdk'); 
const table = 'decks';
AWS.config.setPromisesDependency(require('bluebird'));
AWS.config.update({region: 'us-east-1'})
const url = 'https://spades.bmclive.app'

const ShortUniqueId = require('short-unique-id');
const uid = new ShortUniqueId({ length: 12 });

const CARDS = ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', '0S', 'JS', 'QS', 'KS',
         'AD', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D', '0D', 'JD', 'QD', 'KD',
         'AC', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '0C', 'JC', 'QC', 'KC',
         'AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', '0H', 'JH', 'QH', 'KH']

const SUITS = {'S': 'SPADES', 'D': 'DIAMONDS', 'H': 'HEARTS', 'C': 'CLUBS', '1': 'BLACK', '2': 'RED'}
const VALUES = {'A': 'ACE', 'J': 'JACK', 'Q': 'QUEEN', 'K': 'KING', '0': '10', 'X': 'JOKER'}

/**
 * 
 * @param {String} code suit + value
 * @returns card
 */
const createCard = (code) => {
  let value;
  if( code[0] > 0 ) {
    value = code[0];
  } else {
    value = VALUES[code[0]];
  }
  
  return {
    code,
    image: url + '/static/img/' + code + '.png',
    images : {
            'svg': url + '/static/img/' + code + '.svg',
            'png': url + '/static/img/' + code + '.png'
        },
    value,
    suit : SUITS[code[1]],
    message: value + " of " + SUITS[code[1]] 
  }
}
/**
 * Uid
 */
class Deck {
  
  constructor() {
        const date = new Date().toLocaleString()
        this.id = uid();
        this.last_used = date; //datetime.now
        this.date_created = date;
        this.stack = CARDS; // The cards that haven't been drawn yet.
        this.piles = [];
        this.shuffled = false;
    }
}


/**
 * 
 * @param {[]} deck 
 * @returns {[]} shuffled deck
 */
function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * i);
      let temp = deck[i];
      deck[i] = deck[j];
      deck[j] = temp;
  }
  return deck;
}

const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * 
 * @param {Deck} deck id, date_created, last_used, shuffled, stack, piles
 * @returns put item output (promise)
 */
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

module.exports.createNewDeck = async (event, context, callback) => {
  const deck = new Deck();

  try {
    await createDeck(deck);
    context.status(200).header("Access-Control-Allow-Origin", "*").send({
      success: true,
      deck_id: deck.id,
      remaining: deck.stack.length,
      shuffled: deck.shuffled,
      message: "Creating a new deck"
    });
  } catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err.errors,
      message: "Failed to create deck"
    });
  }
  
};

module.exports.createShuffledDeck = async (event, context, callback) => {
  const deck = new Deck();
  shuffle(deck.stack);
  deck.shuffled = true;
  try {
    await createDeck(deck);
    context.status(200).header("Access-Control-Allow-Origin", "*").send({
      success: true,
      deck_id: deck.id,
      remaining: deck.stack.length,
      shuffled: deck.shuffled,
      message: "Creating a new, shuffled deck"
    });
  } catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err.errors,
      message: "Failed to create deck"
    });
  }
};

function retrieveDeckByID(deckID) {
  return dynamoDb.get({
    TableName: table,
    Key: {
      id: deckID
    }
  }).promise();
}


module.exports.shuffleDeck = async (event, context, callback) => {
  const deckID = event.params['deck_id'];
  const date = new Date().toLocaleString();
  try {
      await getDeckByID(deckID).then( async (data) => {
      const stack = shuffle(data.stack)
      dynamoDb.update({
          TableName: table,
          Key: {
              id: deckID
          },
          UpdateExpression: 'set #stack = :stack, #last_used = :last_used, #shuffled = :shuffled',
          ExpressionAttributeNames: {
              '#stack': 'stack',
              '#last_used': 'last_used',
              '#shuffled': 'shuffled'
          },
          ExpressionAttributeValues: {
              ':stack': stack,
              ':last_used': date,
              ':shuffled': true
    
          }
      }).promise().then(
        context.status(200).header("Access-Control-Allow-Origin", "*").send({
        success: true,
        deck_id: data.id,
        remaining: stack.length,
        shuffled: true,
        message: `Shuffling deck`
      })
      )
      

    })
    
  } catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err.errors,
      message: `Failed to shuffle deck`
    });
    callback(err)
  }
  
};

module.exports.getDec = async (event, context, callback) => {
  const deckID = event.params['deck_id'];

  try {
    await getDeckByID(deckID).then((deck) => {
      context.status(200).header("Access-Control-Allow-Origin", "*").send({
        deck, 
        message: `Retrieving deck with id: ${deckID}`
      });
    })
    
} catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err.message,
      message: err
    });
    callback(err);
  }
  
};

module.exports.getDeck = async (event, context, callback) => {
  const deckID = event.params['deck_id'];

  try {
    await dynamoDb.get({
      TableName: table,
      Key: {
        id: deckID
      }
    }).promise().then((data) => {
  
        if (data.Item && Object.keys(data.Item).length !== 0) {
          // if deck found
          context.status(200).header("Access-Control-Allow-Origin", "*").send({
            deck: data.Item, 
            message: `Retrieving deck with id: ${data.Item.id}`
          });
          
        } else {
          // deck not found
          context.status(400).header("Access-Control-Allow-Origin", "*").send({
            message: `Deck with ID ${deckID} not found`
          });
        }
  
    })
    
} catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err.message,
      message: err
    });
    callback(err);
  }
  
};

/**
 * 
 * @param {String} deckID example: '9SV7ZGrPf9Nd'
 * @returns {Deck} deck from dynamoDB
 */
async function getDeckByID(deckID) {
  try {
      const deck = await retrieveDeckByID(deckID);
      if (deck.Item && Object.keys(deck.Item).length !== 0) {
          return deck.Item;
      }
      throw new Error(`Deck with ID ${deckID} not found`);
  } catch (error) {
      throw error;
  }
}

async function getDeckById(deckID) {

  await retrieveDeckByID(deckID).then( (deck) => {
    
      if (deck.Item && Object.keys(deck.Item).length !== 0) {
        //console.log(deck.Item)
        return deck.Item;
    } else {
      throw new Error(`Deck with ID ${deckID} not found`);
    }
  })
}

/**
 * 
 * @param {String} deckID example: '9SV7ZGrPf9Nd'
 * @param {Number} count number of cards to draw
 * @returns {[String[], Number] | false} 
 */
async function draw (deckID, count) {

  const cards = [];
  try {
      await getDeckByID(deckID).then( async (data) => {
      
        if (count > data.stack.length) {
            console.log(`Count: ${count} exceeds Remaining: ${data.stack.length}`)
            return false;
        }

      for (let i =0; i < count; i++) {
        cards.push(createCard(data.stack.pop()))
      }
      remaining = data.stack.length;
      await dynamoDb.update({
          TableName: table,
          Key: {
              id: deckID
          },
          UpdateExpression: 'set #stack = :stack, #last_used = :last_used',
          ExpressionAttributeNames: {
              '#stack': 'stack',
              '#last_used': 'last_used',
          },
          ExpressionAttributeValues: {
              ':stack': data.stack,
              ':last_used': new Date().toLocaleString(),
    
          }
      }).promise()
      
    })
    
  } catch(err) {
  
  } finally {
    return cards;
  }
  
};

//

module.exports.drawCard = async (event, context, callback) => {
  const deckID = event.params['deck_id'];
  const count = event.query['count']
  const cards = [];

  try {
    await getDeckByID(deckID).then( async (data) => { 

      if (count > data.stack.length) {
        context.status(400).header("Access-Control-Allow-Origin", "*").send({
          message: `Count: ${count} exceeds Remaining: ${data.stack.length}`
        });
      }
  
      for (let i =0; i < count; i++) {
        cards.push(createCard(data.stack.pop()))
      }
      await dynamoDb.update({
        TableName: table,
        Key: {
            id: data.id
        },
        UpdateExpression: 'set #stack = :stack, #last_used = :last_used',
        ExpressionAttributeNames: {
            '#stack': 'stack',
            '#last_used': 'last_used',
        },
        ExpressionAttributeValues: {
            ':stack': data.stack,
            ':last_used': new Date().toLocaleString(),
  
        }
      }).promise().then(
        context.status(200).header("Access-Control-Allow-Origin", "*").send({
          success: true,
          deck_id: data.id,
          cards: cards,
          remaining: data.stack.length,
          message: `Drawing ${count} cards from the deck`
      })
      ) 

    })  
    
  } catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err,
      message: "Data error"
    });
    callback(err)
  }
  
};

module.exports.drawCar = async (event, context, callback) => {
  const deckID = event.params['deck_id'];
  const count = event.query['count']

  try {
      await draw(deckID, count).then( (cards) => {
        context.status(200).header("Access-Control-Allow-Origin", "*").send({
          success: true,
          deck_id: deckID,
          cards: cards,
          remaining: cards[1],
          message: `Drawing ${count} cards from the deck`
      })

      })   
    
  } catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err,
      message: "Data error"
    });
    callback(err)
  }
  
};

module.exports.addToPile = async (event, context, callback) => {
  const deckID = event.params['deck_id'];
  const pileName = event.params['pile_name'];
  const cards = event.query['cards'].split(',')
  

  
  try {
    await getDeckByID(deckID).then( async (data) => {

      for (let i=0; i<data.piles.length; i++) {
        if (data.piles[i][0] === pileName) {
              data.piles[i][1].push(...cards)
              index = i;
              await dynamoDb.update({
                TableName: table,
                Key: {
                    id: data.id
                },
                UpdateExpression: 'set #piles = :piles, #last_used = :last_used',
                ExpressionAttributeNames: {
                    '#piles': 'piles',
                    '#last_used': 'last_used',
                },
                ExpressionAttributeValues: {
                    ':piles': data.piles,
                    ':last_used': new Date().toLocaleString(),
            
                }
            }).promise();

            context.status(200).header("Access-Control-Allow-Origin", "*").send({
              success: true,
              deck_id: data.id,
              remaining: data.stack.length,
              piles: {pileName, remaining: data.piles[i][1].length},
              message: `Adding ${cards.length} cards to ${pileName}`
          });


        } else {
          let pile = []
          pile.push(pileName)
          pile.push(cards);
        
          data.piles.push(pile)
        
          //return deck;
          await dynamoDb.update({
            TableName: table,
            Key: {
                id: data.id
            },
            UpdateExpression: 'set #piles = :piles, #last_used = :last_used',
            ExpressionAttributeNames: {
                '#piles': 'piles',
                '#last_used': 'last_used',
            },
            ExpressionAttributeValues: {
                ':piles': data.piles,
                ':last_used': new Date().toLocaleString(),
        
            }
        }).promise();

        context.status(200).header("Access-Control-Allow-Origin", "*").send({
          success: true,
          deck_id: data.id,
          remaining: data.stack.length,
          piles: {pileName, remaining: data.piles[i][1].length},
          message: `Adding ${cards.length} cards to ${pileName}`
      });
        
        }
      } 
  })
    
  } catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err,
      message: err
    });
    callback(err)
  }
  
};

/**
 * 
 * @param {Deck} deck 
 * @param {String} pile_name 
 * @param {[]} cards 
 */
function addToCardsPile (deck, pile_name, cards) {

  for (let i=0; i<deck.piles.length; i++) {
    if (deck.piles[i][0] === pile_name) {
      deck.piles[i][1].push(...cards)
      return dynamoDb.update({
        TableName: table,
        Key: {
            id: deck.id
        },
        UpdateExpression: 'set #piles = :piles, #last_used = :last_used',
        ExpressionAttributeNames: {
            '#piles': 'piles',
            '#last_used': 'last_used',
        },
        ExpressionAttributeValues: {
            ':piles': deck.piles,
            ':last_used': new Date().toLocaleString(),
    
        }
    }).promise();
    }
  }
  
  let pile = []
  pile.push(pile_name)
  pile.push(cards);

  deck.piles.push(pile)

  //return deck;

  
  return dynamoDb.update({
    TableName: table,
    Key: {
        id: deck.id
    },
    UpdateExpression: 'set #piles = :piles, #last_used = :last_used',
    ExpressionAttributeNames: {
        '#piles': 'piles',
        '#last_used': 'last_used',
    },
    ExpressionAttributeValues: {
        ':piles': deck.piles,
        ':last_used': new Date().toLocaleString(),

    }
}).promise();

}


/**
 * 
 * @param {*} cards 
 * @returns {string[]}
 */
function convertToCode(cards) {
  let codes = [];
  for (let i=0;i < cards.length; i++) {
    codes.push(cards[i].code)
  }

  return codes;
}


function collect(piles) {
  let cards = [];
  for (let i=0;i < piles.length; i++) {
    let codes =[...piles[i][1]]
    console.log(codes)
    // for (let j=0;j < codes.length; j++) {
    //   cards.push(codes[j].code)
    // }
    
  }

  return cards;
}

function clear(piles) {
  for (let i=0;i < piles.length; i++) {
    piles[i][1]= [];
  }

  return piles;
}
module.exports.returnToDeck = async (event, context, callback) => {

  const deckID = event.params['deck_id'];
  let cards;
  let params = false;
    try {
      cards = event.query['cards'].split(',');
      if (cards.length > 0) {
        params = true;
      }  
    } catch(err) {
      params = false;
    }

  
  try {

    await getDeckByID(deckID).then((data) => {
      if (params) {
        data.stack.push(...cards)
        dynamoDb.update({
          TableName: table,
          Key: {
              id: data.id
          },
          UpdateExpression: 'set #stack = :stack, #last_used = :last_used',
          ExpressionAttributeNames: {
              '#stack': 'stack',
              '#last_used': 'last_used',
          },
          ExpressionAttributeValues: {
              ':stack': data.stack,
              ':last_used': new Date().toLocaleString(),
      
          }
      })

      
        context.status(200).header("Access-Control-Allow-Origin", "*").send({
          success: true,
          deck_id: data.id,
          shuffled: data.shuffled,
          remaining: data.stack.length,
          piles: data.piles,
          message: `Returned ${cards.length} cards to deck`
        }); 

      } else {
          let s = data.stack.push(...collect(data.piles));
          let p = clear(data.piles)
          dynamoDb.update({
            TableName: table,
            Key: {
                id: data.id
            },
            UpdateExpression: 'set #stack = :stack, #piles = :piles, #last_used = :last_used',
            ExpressionAttributeNames: {
                '#stack': 'stack',
                '#piles': 'piles',
                '#last_used': 'last_used',
            },
            ExpressionAttributeValues: {
                ':stack': s,
                ':piles': p,
                ':last_used': new Date().toLocaleString(),
        
            }
        })
          
          context.status(200).header("Access-Control-Allow-Origin", "*").send({
            success: true,
            deck_id: data.id,
            shuffled: data.shuffled,
            remaining: data.stack.length,
            piles: data.piles,
            message: `Returned ${data.piles.length} piles to deck`
          });
      }       
    })


  } catch(err) {
    console.log("here4")
    console.log(err)
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err,
      message: "Failed to return to deck"
    });
  } 
  
};
module.exports.returnToPile = async (event, context, callback) => {

  const deckID = event.params['deck_id'];
  const pileName = event.params['pile_name'];
  const cards = event.query['cards'].split(',');

  
  try {

    await getDeckByID(deckID).then( async (data) => {
      data.stack.push(...cards)
        context.status(200).header("Access-Control-Allow-Origin", "*").send({
          success: true,
          deck_id: data.id,
          shuffled: data.shuffled,
          remaining: data.stack.length,
          piles: data.piles,
          cards
        });      
    })
  } catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err.errors,
      message: "Failed to return to deck"
    });
  }
  
};
function convertToCards(pile) {
  const cards = [];
  for (let i=0;i < pile.length; i++) {
    const card = {
    "image": pile[i].image,
    "value": pile[i].value,
    "suit": pile[i].suit,
    "code": pile[i].code,
    }
    cards.push(card)
  }
  
  return cards;
}
function convertPiles(piles, pileName) {
  
  let remaining;
  let pile;
  let listPiles = [];
  for (let i=0;i < piles.length; i++) {
    remaining = piles[i][1][0].length;
    // if pile show ll pile
    if (piles[i][0] === pileName) {
      pile = [];
      //console.log(piles[i][0] + " : " + pileName)
      pile[0] = pileName;
      pile[1] = convertToCards(piles[i][1][0]);
      pile[2] = remaining;
     listPiles.push(pile)
    } else {
    //
    pile = [];
    pile[0] = piles[i][0];
    
    pile[1] = {remaining: piles[i][1][0].length};
    listPiles.push(pile)
    }
    
  }
  //console.log("finl" + cards)
  return listPiles;
}
module.exports.listPiles = async (event, context, callback) => {

  const deckID = event.params['deck_id'];
  const pileName = event.params['pile_name'];
  
  try {
    await getDeckByID(deckID).then((data) => {
      context.status(200).header("Access-Control-Allow-Origin", "*").send({
        success: true,
        deck_id: data.id,
        remaining: data.stack.length,
        piles: convertPiles(data.piles, pileName),
        message: `Listing ${data.piles.length} piles`
      });
    });  

  } catch(err) {
    context.status(500).header("Access-Control-Allow-Origin", "*").send({
      "errors": err.errors,
      message: "Failed to return to deck"
    });
  }
  
};

// getDeckByID('PpE46nYoHwyH').then((d) => {
//   draw('PpE46nYoHwyH', 26).then((c) => {
//     addToCardsPile(d,'p2', c)
//   })
// })

// getDeckByID('xIl1RhxpIPUu').then((d) => {

//   console.log(d)
// })

// getDeckByID('PpE46nYoHwyH').then( async (data) => {
//   let s = collect(data.piles)
//   return
//   //s.push(...collect(data.piles));
//   let p = clear(data.piles)
//   // console.log(s + "\n" + p)
//   // console.log(data.stack.length)
//   data.stack.push(...s)
//   // console.log(data.stack.length)
//   await dynamoDb.update({
//     TableName: table,
//     Key: {
//         id: data.id
//     },
//     UpdateExpression: 'set #stack = :stack, #piles = :piles, #last_used = :last_used',
//     ExpressionAttributeNames: {
//         '#stack': 'stack',
//         '#piles': 'piles',
//         '#last_used': 'last_used',
//     },
//     ExpressionAttributeValues: {
//         ':stack': data.stack,
//         ':piles': p,
//         ':last_used': new Date().toLocaleString(),

//     }
// }).promise()
// })

