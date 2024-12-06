require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const userState = {}
const user = {}
const BASE_URL = process.env.BASE_URL

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const messageText = msg.text;
  
    if (messageText === '/start') {
        bot.sendMessage(chatId, 'Welcome to StakeBot! Please click the following button to add a username.', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Set username', callback_data: 'set_username' },
                    ]
                ]
            }
        });
    } else if (userState[userId] === "waiting_for_username") {
        bot.sendMessage(chatId, 'Thank you, your username has been set. Please follow the subsequent steps by clicking on this button to further set your password.', {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Set password', callback_data: 'set_password' },
                    ]
                ]
            }
        });
        user['username'] = messageText;
    } else if (userState[userId] === "waiting_for_password") {
        user['password'] = messageText;
        try {
            const response = await axios.post(`${BASE_URL}/api/v1/signup`, {
                username: user['username'],
                password: user['password']
            })
            bot.sendMessage(chatId, 'Thank you, your password has been set.');
            bot.sendMessage(chatId, `Congratulations! You have successfully signed up! This is your public key: ${response.data.publicKey}`)
        } catch (error) {
            bot.sendMessage(chatId, `${error.response?.data?.message} Please restart the process by sending /start again in the chat.`);
        }
    }
});

bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const userId = callbackQuery.from.id;

    let responseText = '';
    if (callbackQuery.data === 'set_username') {
        responseText = 'Amazing! Please enter the username you want to proceed with. This will be used for authenticating you further.';
        userState[userId] = "waiting_for_username"
    } else if (callbackQuery.data === 'set_password') {
        responseText = 'Great job selecting a username. Please enter the password you want to set.';
        userState[userId] = "waiting_for_password"
    }

    bot.editMessageText(`${responseText}`, {
        chat_id: chatId,
        message_id: message.message_id
    });

    bot.answerCallbackQuery(callbackQuery.id);
});