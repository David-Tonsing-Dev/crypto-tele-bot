require("dotenv").config();
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// const username = SpiritAngelBot
// const botName = SpiritualBot

const state = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Choose from an option:", {
    reply_markup: {
      keyboard: [["CRYPTO COIN PRICE", "TOP 30 COINS"], ["SEND SIGNAL"]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
});

async function sendTradingSignal(chatId, signal, success) {
  if (success) {
    await bot.sendMessage(chatId, `<b>BIDDING SIGNAL:</b>\n${signal}`, {
      parse_mode: "HTML",
    });
    bot.sendMessage(chatId, "Move back to start", {
      reply_markup: {
        keyboard: [["/start"]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
    delete state[chatId];
  } else {
    await bot.sendMessage(chatId, `${signal}`);
    bot.sendMessage(chatId, "Move back to start", {
      reply_markup: {
        keyboard: [["/start"]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
    delete state[chatId];
  }
}

let priceCheckInterval;

async function checkPriceAndSendSignal(chatId, coinSymbol1, amount) {
  const apiUrl1 = `https://api.coinbase.com/v2/exchange-rates?currency=${coinSymbol1}`;

  priceCheckInterval = setInterval(async () => {
    try {
      const response1 = await axios.get(apiUrl1);

      if (response1.data.data.rates.USD) {
        const price1 = parseFloat(response1.data.data.rates.USD);

        if (price1 <= amount) {
          const signal = `<b>${coinSymbol1}</b> price (<b>$${parseFloat(
            price1
          ).toFixed(
            2
          )}</b>) reached or less than your bid amount <b>$${amount}</b>.\nIts a good time to take some action.\n<b>STOPING THE SIGNAL</b>`;
          sendTradingSignal(chatId, signal, (success = true));
          await clearInterval(priceCheckInterval);
        }
      } else {
        const signal = `Something went wrong! please check if the symbol is correct or not and try again later!`;
        sendTradingSignal(chatId, signal, (success = false));
        await clearInterval(priceCheckInterval);
      }
    } catch (error) {
      console.error("Error fetching data from API:", error);
    }
  }, 10000);
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (state[chatId] && state[chatId].step === 1) {
    if (messageText === "CRYPTO COIN PRICE") {
      bot.sendMessage(chatId, "Choose or enter the coin symbol", {
        reply_markup: {
          keyboard: [
            ["BTC", "SOL"],
            ["INJ", "ETH"],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      state[chatId].step = 2;
    } else if (messageText === "TOP 30 COINS") {
      const apiUrl = "https://api.coincap.io/v2/assets";

      try {
        const response = await axios.get(apiUrl);

        let replyString = "";

        response.data.data.slice(0, 30).forEach((item) => {
          replyString =
            replyString +
            `Rank: <b>${item.rank}</b>\nSymbol: <b>${
              item.symbol
            }</b>\nName: <b>${item.name}</b>\nUSD Price: <b>${parseFloat(
              item.priceUsd
            ).toFixed(2)}</b>\nMarket Cap(USD): <b>${parseFloat(
              item.marketCapUsd
            ).toFixed(2)}</b>\nVolumn 24hr(USD): <b>${parseFloat(
              item.volumeUsd24Hr
            ).toFixed(2)}</b>\n\n`;
        });

        await bot.sendMessage(
          chatId,
          `<b>TOP 10 COINS:</b>\n\n${replyString}`,
          {
            parse_mode: "HTML",
          }
        );
        bot.sendMessage(chatId, "Move back to start", {
          reply_markup: {
            keyboard: [["/start"]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
        delete state[chatId];
      } catch (err) {
        console.log("err", err);
        bot.sendMessage(
          chatId,
          "Something went wrong, try again later.\n Move back to start",
          {
            reply_markup: {
              keyboard: [["/start"]],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }
        );
        delete state[chatId];
      }
    } else if (messageText === "SEND SIGNAL") {
      bot.sendMessage(
        chatId,
        "Enter one coin symbol and a bidding amount separated by commas (e.g., BTC,100)"
      );
      state[chatId].step = 3;
    } else if (messageText === "Option 4") {
      bot.sendMessage(chatId, `You selected ${messageText}`);
      delete state[chatId];
    } else {
      bot.sendMessage(
        chatId,
        "Please select an option from the provided choices."
      );
    }
  } else if (state[chatId] && state[chatId].step === 2) {
    const coinSymbol = messageText.toUpperCase();
    const apiUrl = `https://api.coinbase.com/v2/exchange-rates?currency=${coinSymbol}`;

    try {
      const response = await axios.get(apiUrl);
      if (response.data.data.rates.USD) {
        const coinPrice = parseFloat(response.data.data.rates.USD).toFixed(2);
        await bot.sendMessage(
          chatId,
          `The current price of ${coinSymbol} is $${coinPrice}`
        );
        bot.sendMessage(chatId, "Move back to start", {
          reply_markup: {
            keyboard: [["/start"]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
        delete state[chatId];
      } else {
        bot.sendMessage(
          chatId,
          "Something wrong, please provide existing coin symbol.",
          {
            reply_markup: {
              keyboard: [
                ["BTC", "SOL"],
                ["INJ", "ETH"],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }
        );
        state[chatId].step = 2;
      }
    } catch (error) {
      console.error("Error fetching data from API:", error);
      bot.sendMessage(
        chatId,
        "Something wrong, please provide existing coin symbol."
      );
      bot.sendMessage(chatId, "Choose or enter the coin symbol", {
        reply_markup: {
          keyboard: [
            ["BTC", "SOL"],
            ["INJ", "ETH"],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      state[chatId].step = 2;
    }
  } else if (state[chatId] && state[chatId].step === 3) {
    const input = messageText.split(",");
    if (input.length === 2) {
      const coinSymbol1 = input[0].trim().toUpperCase();
      const amount = parseFloat(input[1].trim());

      checkPriceAndSendSignal(chatId, coinSymbol1, amount);
      bot.sendMessage(
        chatId,
        "Price monitoring started. You will receive a signal when the conditions are met."
      );
    } else {
      bot.sendMessage(
        chatId,
        "Please enter one coin symbol and a bidding amount separated by commas."
      );
    }
    delete state[chatId];
  } else {
    state[chatId] = { step: 1 };
  }
});
