const http = require('http');
const url = require('url');
const WebSocketServer = require('ws').Server;
const createGoogleTokenVerifier = require('./google-auth/google-id-token-verifier');
const SERVER_PORT = 8080;
const GOOGLE_CLIENT_ID = require('./config').GOOGLE_CLIENT_ID;

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

const handleEvent = fromUser => eventJson => {
    const event = JSON.parse(eventJson);
    event.sender = fromUser.id;
    console.log(`< ${fromUser.email}`, event);
    send(event);
};

wss.on('connection', ws => {
    const {user} = ws.upgradeReq;
    console.log(`New user: ${user.name} (${user.email}), num users: ${wss.clients.length}`);
    ws.on('message', handleEvent(user));

    send({type: 'user', sender: user.id, receiver: 'all', payload: user});
});

http.createServer(function (req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    // res.setHeader('Access-Control-Allow-Headers', req.header.origin);
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    const path = url.parse(req.url).pathname;
    if (path === '/getUsers') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({users}));
    } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('not found :(');
    }
}).listen(8000);

console.log('listening on port ', SERVER_PORT);