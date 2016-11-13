const {createBot} = require('../bot-api');

const createEchoBot = (name) => {
    const bot = createBot(name);
    const {whenOneToOne, respondWith} = bot;
    bot.on('message', whenOneToOne(respondWith(({payload}) => payload.text)));
    return bot;
};

module.exports = createEchoBot;