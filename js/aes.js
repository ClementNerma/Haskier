
/**
  * AES class. Supports only CTR mode
  * @constructor
  */
var AESCtr = function() {
  /**
    * Convert string to bytes
    * @param {string} input
    * @return {array} Bytes chain
    */
  this.str2bytes = function(input) {
    if(typeof input !== 'string')
      throw new Error('[AES:str2bytes] Only strings can be converted to bytes chain');

    return aesjs.util.convertStringToBytes(input);
  };

  /**
    * Convert bytes to string
    * @param {array} input Bytes array
    * @return {string}
    */
  this.bytes2str = function(input) {
    if(!Array.isArray(input))
      throw new Error('[AES:bytes2str] Only bytes array can be converted to string');

    return aesjs.util.convertBytesToString(input);
  };

  /**
    * Generate a random key. DO NOT USE IN PRODUCTION (only 62 possibilities)
    * @param {number} [length] Key length, in bits. Default: 256
    * @return {array}
    */
  this.genKey = function(length) {
    // DO NOT USE IN PRODUCTION (only 62 possibilities)

    length = length || 256;

    if(length !== 128 && length !== 192 && length !== 256)
      throw new Error('[AES:randomKey] Key length must be 128, 192 or 256 bytes');

    var str      = '',
        keyChars = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122];

    for(var i = 0; i < length / 8; i++)
      //arr[i] = Math.floor(Math.random() * 256);
      str += String.fromCharCode(keyChars[Math.floor(Math.random() * keyChars.length)]);

    return this.str2bytes(str);
  };

  /**
    * Encrypt
    * @param {array|string} input
    * @param {array|string} key
    * @return {string}
    */
  this.encrypt = function(input, key) {
    if(typeof input === 'string')
      input = this.str2bytes(input);

    return (new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5))).encrypt(input);
  };

  /**
    * Decrypt
    * @param {array|string} input
    * @param {array|string} key
    * @return {string}
    */
  this.decrypt = function(input, key) {
    if(typeof input === 'string')
      input = this.str2bytes(input);

    return this.bytes2str((new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5))).decrypt(input));
  };

};

// Build class
var aes = new AESCtr();
