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

let subscribers = new Set();

setInterval(async () => {
  var weatherUpdate = "";

  try {
    const response = await axios.get(`${server_url}/user`);
    const users = response.data;

    const updatedSubscribers = new Set(); // Use a new set to collect updated subscribers

    for (const user of users) {
      const pair = [user.chatId, user.status];

      if (
        ![...subscribers].some(
          (existingPair) =>
            existingPair[0] === pair[0] && existingPair[1] === pair[1]
        )
      ) {
        updatedSubscribers.add(pair);
      }
    }

    console.log("Subscribers:", subscribers);

    for (const user of updatedSubscribers) {
      if (user[1] === "Active") {
        var chatId = user[0];
        try {
          const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=Delhi&appid=${openWeatherMapApiKey}`
          );
          const weatherData = response.data;
          const weatherDescription = weatherData.weather[0].description;
          const temperature = (weatherData.main.temp - 273.15).toFixed(2);
          const humidity = weatherData.main.humidity;
          const windSpeed = weatherData.wind.speed;

          weatherUpdate = `Location: Delhi\nCurrent weather: ${weatherDescription}\nTemperature: ${temperature}°C\nHumidity: ${humidity}%\nWind Speed: ${windSpeed} m/s. Enjoy your day!`;
          console.log("Weather update sent to", chatId);
          bot.sendMessage(chatId, weatherUpdate);
        } catch (error) {
          console.error("Error fetching weather data:", error);
          bot.sendMessage(chatId, "Error fetching weather data.");
        }
      }
    }
    subscribers = updatedSubscribers;
  } catch (error) {
    console.error("Error fetching subscribers:", error);
  }
}, 10 * 1000); // 10 seconds interval




});