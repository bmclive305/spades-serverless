const ShortUniqueId = require('short-unique-id');
const uid = new ShortUniqueId({ length: 4 });
const Deck = require('./deck');
const {getSuit, getValue} = require('./deck');


class Spades {
    constructor() {
          const date = new Date().toLocaleString()
          this.id = uid();
          this.last_used = date; //datetime.now
          this.date_created = date;
          this.deck = new Deck(); // The cards that haven't been drawn yet.
          this.deck.shuffle();
          this.deck.deal();
          this.spades = false;
          this.players = this.deck.getPlayers();
      }

}

const deck = new Deck();
deck.shuffle();
deck.deal()
console.log(new Spades().id)