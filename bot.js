const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const server_url = "https://telegrambotbackend-production.up.railway.app";

const getTelegramBotToken = async () => {
  try {
    const response = await axios.get(`${server_url}/bot`);
    return response.data[0].token;
  } catch (error) {
    console.error("Error fetching Telegram bot token:", error);
    return null;
  }
};

getTelegramBotToken().then((token) => {
  console.log(token);
  const bot = new TelegramBot(token, { polling: true });
  const openWeatherMapApiKey = "f556851a92b9041eaef2fcab14203f9e";

  const message =
    "Welcome to Weather bot \nHere are the list of commands \nTo subscribe to the weather bot - /subscribe\n To unsubscribe from the weather bot - /unsubscribe";
  let subscribers = new Map();

  const sendWeatherUpdate = async (userId) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=Delhi&appid=${openWeatherMapApiKey}`
      );
      const weatherData = response.data;
      const weatherDescription = weatherData.weather[0].description;
      const temperature = (weatherData.main.temp - 273.15).toFixed(2);
      const humidity = weatherData.main.humidity;
      const windSpeed = weatherData.wind.speed;

      const weatherUpdate = `Location: Delhi\nCurrent weather: ${weatherDescription}\nTemperature: ${temperature}°C\nHumidity: ${humidity}%\nWind Speed: ${windSpeed} m/s. Enjoy your day!`;

      console.log("Weather update sent to", userId);
      bot.sendMessage(userId, weatherUpdate);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      bot.sendMessage(userId, "Error fetching weather data.");
    }
  };

  setInterval(async () => {
    try {
      const response = await axios.get(`${server_url}/user`);
      const users = response.data;

      const updatedSubscribers = new Map();

      for (const user of users) {
        const userId = user.chatId;
        const userStatus = user.status;

        if (!subscribers.has(userId)) {
          updatedSubscribers.set(userId, userStatus);
        }
      }

      console.log("Subscribers:", subscribers);

      for (const [userId, userStatus] of updatedSubscribers) {
        if (userStatus === "Active") {
          await sendWeatherUpdate(userId);
        }
      }

      subscribers = updatedSubscribers;
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    }
  }, 10 * 1000);

  bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (messageText === "/start") {
      bot.sendMessage(chatId, message);
      console.log(chatId);
    }

    if (messageText === "/subscribe") {
      bot.sendMessage(
        chatId,
        "Subscribed to weather bot \nWeather updates will be sent once a day."
      );

      const firstName = msg.chat.first_name;

      const user = {
        firstName: firstName,
        chatId: chatId,
      };

      console.log(user);

      axios
        .post(`${server_url}/user`, user)
        .then((response) => {
          console.log("Data sent successfully", response.data);

          if (response.data === "User added successfully") {
            subscribers.set(chatId, "Active");
          }
        })
        .catch((error) => {
          console.error("Error sending data:", error);
        });
    }

    if (messageText === "/unsubscribe") {
      subscribers.delete(chatId);

      axios
        .delete(`${server_url}/user/${chatId}`)
        .then(() => {
          console.log("Data deleted successfully");
        })
        .catch(() => {
          console.log("Error deleting user");
        });

      bot.sendMessage(chatId, "Unsubscribed from weather bot");
    }
  });
});
