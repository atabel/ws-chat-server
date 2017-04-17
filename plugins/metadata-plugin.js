const getUrls = require('get-urls');
const metaphor = require('metaphor');

const merge = (...objs) => Object.assign({}, ...objs);

const metadataEngine = new metaphor.Engine();

const fetchMetadata = url =>
    new Promise((resolve, reject) => {
        metadataEngine.describe(url, data => {
            if (data) {
                resolve({
                    url: data.url || url,
                    title: data.title,
                    description: data.description,
                    image: data.image,
                    embed: data.embed,
                });
            } else {
                reject();
            }
        });
    });

module.exports = fetchMetadata;

const addMetadata = event => {
    if (event.type !== 'message') {
        return Promise.resolve(event);
    }

    const urls = getUrls(event.payload.text);

    if (urls.length === 0) {
        return Promise.resolve(event);
    }

    return fetchMetadata(urls[0])
        .then(media => merge(event, {payload: merge(event.payload, {media})}))
        .catch(() => event);
};

module.exports = addMetadata;
