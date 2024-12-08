require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey, Connection } = require("@solana/web3.js");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const userState = {}
const user = {}
const BASE_URL = process.env.BASE_URL

const connection = new Connection(process.env.ALCHEMY_SOLANA_DEVNET_RPC_ENDPOINT)

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const messageText = msg.text;
  
    if (messageText === '/start' && (userState[userId] === undefined || userState[userId] === "waiting_for_signup")) {
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

            userState[userId] = "signed_up"
            user['publicKey'] = response.data.publicKey

            bot.sendMessage(chatId, "Choose from these options to proceed next. Enter /menu so view the options again.", {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'Stake SOL', callback_data: 'stake_sol' },
                            { text: 'Trade LST', callback_data: 'trade_lst' }
                        ],
                        [
                            { text: 'Withdraw SOL', callback_data: 'withdraw_sol' }
                        ],
                        [
                            { text: 'View wallet', callback_data: 'view_wallet' }
                        ]
                    ]
                }
            })
        } catch (error) {
            bot.sendMessage(chatId, `${error.response?.data?.message} Please restart the process by sending /start again in the chat.`);
            userState[userId] = "waiting_for_signup"
        }
    } else if (userState[userId] === "signed_up" && messageText === "/menu") {
        bot.sendMessage(chatId, "Please choose from these options to proceed.", {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Stake SOL', callback_data: 'stake_sol' },
                        { text: 'Trade LST', callback_data: 'trade_lst' }
                    ],
                    [
                        { text: 'Withdraw SOL', callback_data: 'withdraw_sol' }
                    ],
                    [
                        { text: 'View wallet', callback_data: 'view_wallet' }
                    ]
                ]
            }
        })
    } else if (userState[userId] === "waiting_for_withdraw_sol") {
        const withdrawSOLResponse = messageText.split(',').map((val) => val.trim())
        const sol = Number(withdrawSOLResponse[0])
        const address = withdrawSOLResponse[1]

        if (isNaN(sol)) {
            bot.sendMessage(chatId, 'Incorrect format/value of SOL entered, please try entering the values again in the format SOL_to_withdraw, address_to_withdraw_to. For example: 0.1,<address> would mean you want to withdraw 0.1 SOL from your current account associated with StakeBot into the account at address <address>.')
        }

        try {
            const tx = new Transaction()

            tx.add(SystemProgram.transfer({
                fromPubkey: new PublicKey(user['publicKey']),
                toPubkey: new PublicKey(address),
                lamports: sol * LAMPORTS_PER_SOL
            }))

            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            tx.feePayer = new PublicKey(user['publicKey'])

            const serializedTx = tx.serialize({
                requireAllSignatures: false,
                verifySignatures: false
            });

            const response = await axios.post(`${BASE_URL}/api/v1/txn/sign`, {
                serializedTx: serializedTx,
                retry: false,
                publicKey: user['publicKey']
            });
            console.log(response.data);
        } catch (error) {
            bot.sendMessage(chatId, 'Error withdrawing SOL. Please try entering the values again in the format SOL_to_withdraw, address_to_withdraw_to. For example: 0.1,<address> would mean you want to withdraw 0.1 SOL from your current account associated with StakeBot into the account at address <address>.')
        }
    }
});

bot.on('callback_query', async (callbackQuery) => {
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
    } else if (callbackQuery.data === 'stake_sol') {
        responseText = 'Staking SOL'
    } else if (callbackQuery.data === 'withdraw_sol') {
        responseText = 'Enter comma-separated reply in the format SOL_to_withdraw, address_to_withdraw_to. For example: 0.1,<address> would mean you want to withdraw 0.1 SOL from your current account associated with StakeBot into the account at address <address>.'
        userState[userId] = "waiting_for_withdraw_sol"
    } else if (callbackQuery.data === 'view_wallet') {
        const response = await axios.post(`${BASE_URL}/api/v1/wallet`, {
            publicKey: user['publicKey']
        })

        const accountInfo = response.data.value
        
        if (accountInfo) {
            responseText = `Your wallet holds ${accountInfo.lamports / LAMPORTS_PER_SOL} SOL.`
        } else {
            responseText = `Please deposit some SOL into your wallet at ${user['publicKey']} to see details.`
        }
    }

    bot.editMessageText(`${responseText}`, {
        chat_id: chatId,
        message_id: message.message_id
    });

    bot.answerCallbackQuery(callbackQuery.id);
});