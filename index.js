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

const getUsersList = () =>
    wss.clients.map(({upgradeReq: {user}}) => user);

const isUserAlreadyLoggedIn = user =>
    getUsersList().some(({id}) => id === user.id);

const wss = new WebSocketServer({
    port: SERVER_PORT,
    verifyClient(info, cb) {
        const token = info.req.url.substr(1);
        if (token.startsWith('BOT/')) {
            const userJson = decodeURIComponent(token.substr('BOT/'.length));
            console.log('register new bot: ', userJson);
            try {
                const user = JSON.parse(userJson)
                info.req.user = user;
                cb(true);
            } catch (e) {
                cb(false, 401, 'Bad bot encoding');
            }
        } else {
            verifyAuthToken(token).then(tokenInfo => {
                const user = createUser(tokenInfo);
                if (isUserAlreadyLoggedIn(user)) {
                    cb(false, 401, `Unauthorized: already logged!`);
                } else {
                    info.req.user = user;
                }
                cb(true);
            }).catch(e => {
                cb(false, 401, `Unauthorized: ${e.message}`);
            });
        }
    },
});

const plugins = [
    require('./plugins/metadata-plugin'),
];

const applyPlugins = event =>
    plugins.reduce((event, plugin) => Promise.resolve(plugin(event)), event);

const send = event => {
    const {receiver, sender} = event;
    const receivers = receiver === 'all'
        ? wss.clients
        : wss.clients.filter(({upgradeReq: {user}}) => user.id === receiver || user.id === sender);

    receivers.forEach(ws => {
        console.log(`> ${ws.upgradeReq.user.email}`, event);
        ws.send(JSON.stringify(event));
    });
};

const handleInServer = event => {
    if (event.type === 'getUsers') {
        getUsersList().forEach(user => {
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
        applyPlugins(event).then(send);
    }
};

const notyfyDisconnection = user => () => {
    console.log(`Offline: ${user.email} | #users: ${wss.clients.length}`);
    send({type: 'disconnect', sender: 'server', receiver: 'all', payload: user.id});
}

wss.on('connection', ws => {
    const {user} = ws.upgradeReq;
    console.log(`Connect: ${user.email} | #users: ${wss.clients.length}`);

    ws.on('message', handleEvent(user));
    ws.on('close', notyfyDisconnection(user))

    send({type: 'user', sender: user.id, receiver: 'all', payload: user});
});

console.log('listening on port ', SERVER_PORT);