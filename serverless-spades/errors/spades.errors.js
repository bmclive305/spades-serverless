module.exports = class AuthorizationError extends Error {
    constructor(errors) {
        super("Authorization Error");
        this.errors = errors;
    }
}

module.exports = class PlayerIdError extends Error {
    constructor(errors) {
        super('Player ID Error');
        this.errors = errors;
    }
}

module.exports = class InvalidCardError extends Error {
    constructor(errors) {
        super('Invalid Card Error');
        this.errors = errors;
    }
}

module.exports = class SuitNotFoundError extends Error {
    constructor(errors) {
        super('Suit not found Error');
        this.errors = errors;
    }
}