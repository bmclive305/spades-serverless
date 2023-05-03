const ShortUniqueId = require('short-unique-id');
const PlayerIdError = require('../errors/spades.errors');
const InvalidCardError = require('../errors/spades.errors');
const SuitNotFoundError = require('../errors/spades.errors');
const Circularray = require('circularray');
const uid = new ShortUniqueId({ length: 8 });
const prompt = require('prompt-sync')();

const CARDS = ['AS', '2S', '3S', '4S', '5S', '6S', '7S', '8S', '9S', '0S', 'JS', 'QS', 'KS',
         'AD', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D', '0D', 'JD', 'QD', 'KD',
         'AC', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '0C', 'JC', 'QC', 'KC',
         'AH', '2H', '3H', '4H', '5H', '6H', '7H', '8H', '9H', '0H', 'JH', 'QH', 'KH']

const SUITS = {'S': 'SPADES', 'D': 'DIAMONDS', 'H': 'HEARTS', 'C': 'CLUBS', '1': 'BLACK', '2': 'RED'}
const VALUES = {'A': 'ACE', 'J': 'JACK', 'Q': 'QUEEN', 'K': 'KING', '0': '10', 'X': 'JOKER'}
/**
 * 
 * @param {string} card 
 */
function getSuit(card) {
    return SUITS[card[1]]
}

/**
 * 
 * @param {string} card 
 */
function getValue(card) {
    let value = parseInt(card[0])
    if (value > 0) {
        return value;
    }
    if (value === 0) {
        return 10;
    }
    switch(card[0]) {
        case 'A':
            return 14;
        case 'K':
            return 13;
        case 'Q':
            return 12;
        case 'J':
            return 11;
        default:
            throw new InvalidCardError(`Card: '${card}' invalid !`);
    }
}

function compareFn(a, b) {
    if (getValue(a) < getValue(b)) {
      return -1;
    }
    if (getValue(a) > getValue(b)) {
      return 1;
    }
    // a must be equal to b
    return 0;
  }

function sortCards(cards) {
    const sorted = [];
    const hearts = [];
    const clubs = [];
    const diamonds = [];
    const spades = []; 
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        switch(getSuit(cards[i])) {
            case 'HEARTS':
                hearts.push(card);
                break;
            case 'CLUBS':
                clubs.push(card);
                break;
            case 'DIAMONDS': 
                diamonds.push(card);
                break;
            case 'SPADES':
                spades.push(card);
                break;
            default:
                throw new InvalidCardError(`Card: '${card}' invalid or not found !`);           
        }
    }
    // console.log('h :' + [...hearts.sort()])
    // console.log(hearts)
    // hearts.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))})
    // console.log(hearts)
    sorted.push(...hearts.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))}))
    
    sorted.push(...clubs.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))}))
    sorted.push(...diamonds.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))}))
    sorted.push(...spades.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))}))
//console.log('s: ' + sorted)
    return sorted;

}


class Deck {
    constructor() {
          const date = new Date().toLocaleString()
          this.id = uid();
          this.last_used = date; //datetime.now
          this.date_created = date;
          this.stack = CARDS; // The cards that haven't been drawn yet.
          this.players = new Circularray();
      }

    shuffle() {
        for (let i = this.stack.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * i);
            let temp = this.stack[i];
            this.stack[i] = this.stack[j];
            this.stack[j] = temp;
        }
    }

    deal() {    
        const date = new Date().toLocaleString();
        for (let i = 0; i < 4; i++){
            const id = i.toString();
            let cards = [];
            const books = [];
            for (let j = 0; j < 13; j++) {
                cards.push(this.stack.pop());
            }
            cards = sortCards(cards);
            const remaining = cards.length;
            const last_active = date;
            this.players.push({id, cards, books, remaining, last_active})
        }
    }

    update(id) {
        const date = new Date().toLocaleString();
        let current = this.players.pointer
        for (let i = 0; i < this.players.length; i++) {      
            if (current.value.id === id) {
                current.value.last_active = date;
                this.last_used = date;
                return;
            }
            current = current.next;
        }
        throw new PlayerIdError(`Player Id: '${id}' invalid !`); 
    }

    sortCards(cards) {
        const sorted = [];
        const hearts = [];
        const clubs = [];
        const diamonds = [];
        const spades = []; 
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            switch(getSuit(cards[i])) {
                case 'HEARTS':
                    hearts.push(card);
                    break;
                case 'CLUBS':
                    clubs.push(card);
                    break;
                case 'DIAMONDS': 
                    diamonds.push(card);
                    break;
                case 'SPADES':
                    spades.push(card);
                    break;
                default:
                    throw new InvalidCardError(`Card: '${card}' invalid or not found !`);           
            }
        }
        // console.log('h :' + [...hearts.sort()])
        // console.log(hearts)
        // hearts.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))})
        // console.log(hearts)
        sorted.push(...hearts.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))}))
        
        sorted.push(...clubs.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))}))
        sorted.push(...diamonds.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))}))
        sorted.push(...spades.sort(function(a, b){return (getValue(a) < getValue(b)) - (getValue(a) > getValue(b))}))
    console.log(sorted)
        return sorted;
    
    }



    playCard(id, card) {
        let current = this.players.pointer

        for (let i = 0; i < this.players.length; i++) {
            
            if (current.value.id === id) {
                for (let j = 0; j < current.value.cards.length; j++) {
                    if (current.value.cards[j] === card) {
                        const playCard = current.value.cards.splice(j, 1);
                        current.value.remaining = current.value.cards.length
                        return playCard[0];
                    }
                }
                throw new InvalidCardError(`Card: '${card}' invalid or not found !`);               
            }

            current = current.next;
        }
        throw new PlayerIdError(`Player Id: '${id}' invalid !`);       
    }

    popCard(id) {
        let current = this.players.pointer

        for (let i = 0; i < this.players.length; i++) {
            
            if (current.value.id === id) {
                const playCard = current.value.cards.pop();
                current.value.remaining = current.value.cards.length
                //this.players.pointer = head;
                return playCard;           
            }

            current = current.next;
        }
        throw new PlayerIdError(`Player Id: '${id}' invalid !`);       
    }
    /**
     * Plays Suit, if suit not found, procceeds to cut
     * @param {*} id 
     * @param {*} suit 
     * @returns 
     */
    playToWin(id, suit) {

        let current = this.players.pointer
        // All hands/players in deck
        for (let i = 0; i < this.players.length; i++) {
            if (current.value.id == id) {
                // player found
                try {
                    const cards = this.getCardsBySuit(id, suit);
                    const card = this.playHigh(cards);
                    const playCard = this.playCard(id, card);
                    this.update(id);
                    return playCard;
                } catch(err) {
                    // suit not found, proceed to cut
                    try {
                        const cards = this.getCardsBySuit(id, 'SPADES');
                        const card = this.playLow(cards);
                        const playCard = this.playCard(id, card);
                        this.update(id);
                        return playCard;    
                    } catch(err) {
                        const cards = this.getCardsBySuit(id, getSuit(current.value.cards[0]));
                        const card = this.playLow(cards);
                        const playCard = this.playCard(id, card);
                        this.update(id);
                        return playCard;
                    }
                    
                }
            } 
            current = current.next 
        }
        // player not found
        throw new PlayerIdError(`Player Id: '${id}' invalid !`);
        
    }

    getCardsBySuit(id, suit) {
        let current = this.players.pointer;
        // All hands/players in deck
        for (let i = 0; i < this.players.length; i++) {
            if (current.value.id == id) {
                // player found
                const spades = [];
                let playCard;
                for (let j = 0; j < current.value.cards.length; j++) {
                    if (getSuit(current.value.cards[j]) === suit) {
                        // spade found                     
                        //const playCard = this.piles[i].cards.splice(j, 1);
                        //this.piles[i].remaining = this.piles[i].cards.length
                        playCard = current.value.cards[j];
                        spades.push(playCard);
                    }    
                }
                if (spades.length === 0) {
                    throw new SuitNotFoundError(`No '${SUITS.S}' remaining !`);
                }
                return spades;
                // No spades remain
                
            } 

            current = current.next;
        }
        // player not found
        throw new PlayerIdError(`Player Id: '${id}' invalid !`);
        
    }

    playHigh(cards) {
        let max = getValue(cards[0]);
        let card = cards[0];
        for (let i = 1; i < cards.length; i++) {
            if (getValue(cards[i]) > max) {
                max = getValue(cards[i]);
                card = cards[i];
            }
        }
        return card;
    }

    playLow(cards) {
        let min = getValue(cards[0]);
        let card = cards[0];
        for (let i = 1; i < cards.length; i++) {
            if (getValue(cards[i]) < min) {
                min = getValue(cards[i]);
                card = cards[i];
            }
        }
        return card;
    }

    play() {
        
        let current = this.players.pointer;
        let leadCard;
        if (current.value.id === '0') {
            console.log('\n\nSelect Card: ' + current.value.cards + '\n')
            const input = prompt('');
            leadCard = this.playCard(current.value.id, input)
        } else {
            leadCard = this.popCard(current.value.id);
        }
        //let leadCard = this.popCard(current.value.id);
        let leader = current;
        console.log('Player ' + leader.value.id  + ' leads')
        const book = [leadCard];
        const suit = getSuit(leadCard);
        current = current.next;
        for ( let i = 0; i < this.players.length-1; i++) {
            let card;
            if (current.value.id === '0') {
                console.log(book + '\n\nSelect Card: ' + current.value.cards + '\n')
                const input = prompt('');
                card = this.playCard(current.value.id, input)

            } else {
                card = this.playToWin(current.value.id, suit);
            }
            
            // if Suit SPADES
            if (suit === 'SPADES') {
                // if SPADE larger
                if (getValue(card) > getValue(leadCard) && getSuit(card) === 'SPADES') {
                    // set new leader
                    //console.log(leadCard + "  " + card);
                    leader = current;
                    leadCard = card;
                    // console.log(leadCard + "  " + card);
                    book.push(card);
                    current = current.next;
                    
                    continue;
                }
                book.push(card)
                current = current.next;
                continue;
            } else if (suit !== 'SPADES') {
                // if suit cut
                //console.log(getSuit(card))
                if (getSuit(card) === 'SPADES') {
                    // if leadCard SPADE
                    if (getSuit(leadCard) === 'SPADES') {
                        if (getValue(card) > getValue(leadCard)) {
                            leader = current;
                            console.log(leadCard + "  " + card);
                            leadCard = card;
                            console.log(leadCard + "  " + card);
                            book.push(card);
                            current = current.next;
                            continue;
                        }
                        // cut card not higher
                        book.push(card);
                        current = current.next;
                        continue;
                    } else {
                        // leadCard not Spade
                        leader = current;
                        leadCard = card;
                        book.push(card);
                        current = current.next;
                        continue;
                    }
                } else {
                    if (getSuit(card) === suit && getValue(card) > getValue(leadCard)) {
                        leader = current;
                        leadCard = card;
                        book.push(card);
                        current = current.next;
                        continue;
                    }
                    // not cut
                    book.push(card);
                    current = current.next;
                    continue;
                }
            }    
            }
            
            

        // rotate leader
        
        // add book
        console.log('Winner: player ' + leader.value.id + ' ' + leadCard + '--' + book);
        console.log('HAND: ' + leader.value.cards);
        this.addBook(leader.value.id, book);
        this.players.pointer = leader;
 
    }

    getPlayers() {
        return this.players.toArray();
    }

    getPlayerByID(id) {

        let current = this.players.pointer;

        for (let i = 0; i < this.players.length; i++) {
            if (current.value.id == id) {
                return current.value;
            }
            current = current.next;
        }
        // player not found
        throw new PlayerIdError(`Player Id: '${id}' invalid !`);
    }

    addBook(id, book) {
        let current = this.players.pointer;
        
        for (let i = 0; i < this.players.length; i++) {
            if (current.value.id == id) {
                current.value.books.push(book)
                this.stack.push(book)
                this.update(id)
                return;
            }

            current = current.next;
        }
        // player not found
        throw new PlayerIdError(`Player Id: '${id}' invalid !`);  
    }

    getWinner() {
        let current = this.players.pointer
        let max = current.value.books.length;
        let id = current.value.id;
        for (let i = 1; i < this.players.length; i++) {
            if (current.value.books.length > max) {
                max = current.length;
                id = current.value.id;
            }
            current = current.next;
        }
        return this.getPlayerByID(id)
    }
}

module.exports = Deck, getSuit, getValue

let d = new Deck();
d.shuffle();
d.deal();
//console.log(d.getPlayers())
// d.play();
// d.play();
console.log(d.getPlayers())
//console.log(c)

// d.play('HEARTS')
// d.play('DIAMONDS')
//console.log(d.stack);
//console.log(d.getPlayers());
// console.log(d.getCardsBySuit('1','CLUBS'));
// console.log(d.getCardsBySuit('2','DIAMONDS'));
// console.log(d.getCardsBySuit('3','SPADES'));
//console.log(d.getPlayers());
