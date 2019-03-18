const { remote, nativeImage, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const { app, session } = remote;

// Loads these behaviors into browser (unsure if this is required anymore)
const _setImmediate = setImmediate;
const _clearImmediate = clearImmediate;
const _Buffer = Buffer;
process.once('loaded', () => {
    global.setImmediate = _setImmediate;
    global.clearImmediate = _clearImmediate;
    global.Buffer = _Buffer;
});

window.appVersion = remote.app.getVersion();
window.closeAfterPost = () => remote.getCurrentWindow().closeAfterPost;
window.nativeImage = nativeImage;
window.getFileIcon = app.getFileIcon;
window.BrowserWindow = remote.BrowserWindow; // Pretty much only used for PaigeeWorld right now

const Encrypt = require('./src/encrypt.js');

// Set up profiles DB
const adapter = new FileSync(path.join(app.getPath('userData'), 'data', 'profiles.json'), {
  serialize: (data) => Encrypt.encryptProfile(data),
  deserialize: (data) => Encrypt.decryptProfile(data)
});
const ldb = low(adapter);
window.profilesDB = ldb;

// Set up templates DB
const templatesAdaptor = new FileSync(path.join(app.getPath('userData'), 'data', 'templates.json'));
const tldb = low(templatesAdaptor);
window.templateDB = tldb;

// Set up description templates DB
const descriptionAdapter = new FileSync(path.join(app.getPath('userData'), 'data', 'description-templates.json'));
const dldb = low(descriptionAdapter);
window.descriptionTemplateDB = dldb;

// Set up settings DB
const settingsAdapter = new FileSync(path.join(app.getPath('userData'), 'data', 'settings.json'));
const sldb = low(settingsAdapter);
window.settingsDB = sldb;
settingsDB.defaults({
  hardwareAcceleration: true,
  postInterval: 0,
  clearQueueOnFailure: true,
  advertise: true
}).write();

window.got = require('./src/got-request.js');

window.auth = {
  deviantart: require('./src/deviant-art-auth.js'),
  mastodon: require('./src/mastodon-auth.js'),
  tumblr: require('./src/tumblr-auth.js'),
  twitter: require('./src/twitter-auth.js')
};

window.AUTH_URL = require('./src/auth-server.js').auth_server;

/**
 * Writes object data to a specified JSON file
 * @param  {string} fileName Name of the file to write to
 * @param  {object} data     Data to be written
 */
window.writeJsonToFile = function writeJsonToFile(fileName, data) {
    fs.writeJson(path.join(app.getPath('userData'), 'data', `${fileName}.json`), data, (err) => {
        if (err) {
            console.error(err);
        }
    });
};

/**
 * Reads a JSON file and returns the data
 * @param  {string} fileName The name of the file
 */
window.readJsonFile = function readJsonFile(fileName) {
  return new Promise((resolve) => {
    fs.readJson(path.join(app.getPath('userData'), 'data', `${fileName}.json`), (err, data) => {
      resolve(data);
    });
  });
};

/**
 * Opens a url in the user's native/default browser
 * @param  {string} url URL being opened
 */
window.openUrlInBrowser = function openUrl(url) {
    shell.openExternal(url);
};

/**
 * Gets cookies for session given a url and persist id
 * @param  {string} persistId
 * @param  {string} url
 * @return {Promise<Cookie[]>}     Cookies
 */
window.getCookies = function getCookies(persistId, url) {
    const cookies = session.fromPartition(`persist:${persistId}`).cookies;
    return new Promise((resolve, reject) => {
        cookies.get({ url }, (error, cookies) => {
            error ? reject(error) : resolve(cookies);
        });
    });
};

/**
 * Gets the API to the cookie container
 * @param  {string} persistId
 */
window.getCookieAPI = function getCookieAPI(persistId) {
  return session.fromPartition(`persist:${persistId}`).cookies;
}

/**
 * Gets the Session for the id
 */
window.getSession = function(persistId) {
  return session.fromPartition(`persist:${persistId}`);
}

window.getClipboardFormats = clipboard.availableFormats;
window.writeToClipboard = clipboard.write;
window.readClipboard = function readClipboard() {
    return { availableFormats: clipboard.availableFormats(), content: clipboard.readImage() };
};

// Relaunch application (mostly used for toggling hardware acceleration)
window.relaunch = function relaunch() {
    app.relaunch();
    app.exit();
};
