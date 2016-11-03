const url = require('url');
const WebSocketServer = require('ws').Server;
const createGoogleTokenVerifier = require('./google-auth/google-id-token-verifier');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || require('./config').GOOGLE_CLIENT_ID;
const SERVER_PORT = process.env.PORT || 8080;

const verifyAuthToken = createGoogleTokenVerifier({clientId: GOOGLE_CLIENT_ID});

const createUser = ({name, picture, given_name, email, family_name, sub}) => ({
    fullName: name,
    avatar: picture,
    name: given_name,
    familyName: family_name,
    email,
    id: sub
});

const users = [];

const wss = new WebSocketServer({
    port: SERVER_PORT,
    verifyClient(info, cb) {
        const token = info.req.url.substr(1);
        verifyAuthToken(token).then(tokenInfo => {
            info.req.user = createUser(tokenInfo);
            users.push(info.req.user);
            cb(true);
        }).catch(e => {
            cb(false, 401, `Unauthorized: ${e.message}`);
        });
    },
});

const send = event => {
    const {receiver, sender} = event;
    const receivers = receiver === 'all'
        ? wss.clients.filter(({upgradeReq: {user}}) => user.id !== sender)
        : wss.clients.filter(({upgradeReq: {user}}) => user.id === receiver);

    receivers.forEach(ws => {
        console.log(`> ${ws.upgradeReq.user.email}`, event);
        ws.send(JSON.stringify(event));
    });
};

const handleInServer = event => {
    if (event.type === 'getUsers') {
        users.forEach(user => {
            send({type: 'user', sender: 'server', receiver: event.sender, payload: user});
        });
    }
};

const handleEvent = fromUser => eventJson => {
    const event = JSON.parse(eventJson);
    event.sender = fromUser.id;
    console.log(`< ${fromUser.email}`, event);
    if (event.receiver === 'server') {
        handleInServer(event);
    } else {
        send(event);
    }
};

wss.on('connection', ws => {
    const {user} = ws.upgradeReq;
    console.log(`New user: ${user.name} (${user.email}), num users: ${wss.clients.length}`);
    ws.on('message', handleEvent(user));

    send({type: 'user', sender: user.id, receiver: 'all', payload: user});
});

console.log('listening on port ', SERVER_PORT);