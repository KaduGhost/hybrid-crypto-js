import {AsyncStorage} from 'react-native';
var forge = require('node-forge');
var pki = forge.pki;
var rsa = pki.rsa;

const KEYSTORE_NAME = 'keyStore';
const KEYPAIR_NAME = 'keypair1';

const RSA_KEY_SIZE = 1024 * 4;
const RSA_STANDARD = 'RSA-OAEP';


class KeyManager {

    constructor() {
        this.fetched = false;
        this.taskCallbacks = [];
    }

    getKeys(callback) {
        var self = this;
        function done(err, keys) {
            var keypair;
            if (keys) {
                keypair = self.pemToKeys(JSON.parse(keys));
                self.keypair = keypair;
                self.fetched = true;
                callback(keypair);
            } else {
                self.generateKeypair(callback)
            }

            while (self.taskCallbacks.length) {
                self.taskCallbacks.pop()(keypair);
            }
        }

        if (this.fetched) {
            callback(this.keypair);

        } else if (this.fetching) {
            this.taskCallbacks.push(callback)

        } else {
            this.fetching = true;
            AsyncStorage.getItem(`@${KEYSTORE_NAME}:${KEYPAIR_NAME}`, done);
        }
    }

    generateKeypair(callback) {
        var self = this;
        var keysGenerated = function(err, keypair) {
            self.saveKeys(keypair, callback)
        }

        rsa.generateKeyPair({bits: RSA_KEY_SIZE}, keysGenerated)
    }

    saveKeys(keypair, callback) {
        var self = this;
        var pems = this.keysToPem(keypair);
        var done = function(err) {
            if (!err) {
                self.keypair = keypair;
                self.fetched = true;
                if (callback) callback(self.keypair);
            }
        }
        AsyncStorage.setItem(`@${KEYSTORE_NAME}:${KEYPAIR_NAME}`, JSON.stringify(pems), done);
    }

    keysToPem(keypair) {
        keypair.publicKey = pki.publicKeyToPem(keypair.publicKey);
        keypair.privateKey = pki.privateKeyToPem(keypair.privateKey);
        return keypair
    }

    pemToKeys(keypair) {
        keypair.publicKey = pki.publicKeyFromPem(keypair.publicKey);
        keypair.privateKey = pki.privateKeyFromPem(keypair.privateKey);
        return keypair
    }

    encrypt(publicKey, decrypted) {
        return publicKey.encrypt(decrypted, RSA_STANDARD);
    }

    decrypt(privateKey, encrypted) {
        return privateKey.decrypt(encrypted, RSA_STANDARD);
    }
}

export default new KeyManager();