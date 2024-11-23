const { z } = require('zod');
const crypto = require('crypto');

function validateSignUpInputs(req, res, next) {
    const signUpBodyObject = z.object({
        username: z.string(),
        password: z.string()
    });
    try {
        signUpBodyObject.parse(req.body)
        next()
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.log(error.issues);
        }

        res.status(400).json({
            message: "Zod validation failed. Wrong type of data sent for username or password. String required."
        })
    }
}

function encrypt(text, secret) {
    const key = crypto.scryptSync(secret, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, crypto.randomBytes(16));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};
  
function decrypt(encryptedText, secret) {
    const key = crypto.scryptSync(secret, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, crypto.randomBytes(16));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

module.exports = {
    validateSignUpInputs,
    encrypt,
    decrypt
}