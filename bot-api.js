const createClient = require('./chat-client');
const md5 = require('md5');
const {v4: createId} = require('uuid');

const getAvatar = email => `http://www.gravatar.com/avatar/${md5(email)}?s=48&d=identicon&r=PG`;

const createBotUser = name => {
    const id = createId();
    const email = `bot_${id}@chatbot.com`;
    const avatar = getAvatar(email);
    return {
        name,
        id,
        email,
        avatar,
        fullName: name,
        familyName: name,
    };
};

const createBot = name => {
    const botUser = createBotUser(name);
    const client = createClient('BOT/' + encodeURIComponent(JSON.stringify(botUser)));

    const sendMessage = (...args) => setTimeout(() => client.sendMessage(...args), 200);

    const respondWith = getResponse => (action, ...rest) => {
        const text = typeof getResponse === 'function' ? getResponse(action, ...rest) : getResponse;
        const {receiver, sender} = action;
        sendMessage(text, receiver === botUser.id ? sender : receiver);
    };

    const whenOneToOne = fn => (action, ...rest) => {
        if (action.receiver === botUser.id) {
            fn(action, ...rest);
        }
    };

    return {
        data: botUser,
        init: client.init,
        respondWith,
        whenOneToOne,
        matches,
        sendMessage,
        on: client.on,
    };
};

const escapeRegExp = string => string.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1');

const textMatchesSelector = (text, selector) => {
    const matches = text.startsWith(selector);
    const parsedText = matches ? text.replace(new RegExp(escapeRegExp(selector) + '\s*'), '') : null;
    return [matches, parsedText];
};

const matches = selectors => action => {
    const handled = Object.keys(selectors).filter(selector => selector !== 'default').some(selector => {
        const {text} = action.payload;
        const [matches, parsedText] = textMatchesSelector(text, selector);
        if (matches) {
            selectors[selector](action, parsedText);
        }
        return matches;
    });

    if (!handled && 'default' in selectors) {
        selectors['default'](action);
    }
};

module.exports = {
    createBot,
    matches,
};
