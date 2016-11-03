const fetch = require('node-fetch');

const VALID_ISSUERS = [
    'accounts.google.com',
    'https://accounts.google.com',
];

const isValidIssuer = issuer =>
    VALID_ISSUERS.indexOf(issuer) >= 0;

const verifyAuthToken = clientId => token => {
    if (!token) {
        return Promise.reject(new Error('AuthError: invalid token'));
    } else {
        return fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`)
            .then(res => res.json())
            .then(tokenInfo => {
                if (tokenInfo.aud !== clientId) {
                    throw new Error('AuthError: Unrecognized client id');
                } else if (!isValidIssuer(tokenInfo.iss)) {
                    throw new Error('AuthError: Wrong issuer');
                }
                return tokenInfo;
            }).catch(e => {
                throw new Error('AuthError');
            });
    }
};

const createVerifier = ({clientId}) =>
    verifyAuthToken(clientId)

module.exports = createVerifier;