const vader = require('vader-sentiment');
const Discord = require('discord.js');
const express = require("express");
const axios = require('axios').default;
const BotCommands = require("./utils/BotCommands");
const logging = require("./utils/Logging");

var sqlite3 = require('sqlite3').verbose();
var path = require('path');
var moment = require('moment');

require('dotenv').config()

const db = new sqlite3.Database(process.env.DATABASE);
const client = new Discord.Client();

const app = express();
const port = 8888

var daily_channel;

console.log("Starting up ...");
client.login(process.env.LOGIN_TOKEN).then((token) => console.log(token));


client.once('ready', () => {
    logging.submit_log('Discovader successfully logged in to Discord!');
    client.channels.fetch(process.env.DAILY_CHANNEL).then((channel) => {
        daily_channel = channel;
    })
});

client.on('message', message => {
    if(message.member.id == client.user.id){
        logging.submit_log("Bot sent a message.")
        return;
    }

    if(message.content == "!aita"){
        axios.get('http://localhost:5000/aita')
        .then((response) => {message.channel.send(response["data"])})
    }

    let chance = Math.random();
    let toAnalyze = BotCommands.processIncomingMessage(message.content, client);

    let intensity = vader.SentimentIntensityAnalyzer.polarity_scores(toAnalyze);
    logging.submit_log(`chance: ${chance} score: ${intensity["compound"]}`);

    if(message.content.split(" ")[0].includes(client.user.id)){
        let args = message.content.split(" ");
        args[1] = args[1].toLowerCase();
        if(args[1] == "explain"){
            BotCommands.explain(message.channel, client);
        }else if(args[1] == "average"){
            BotCommands.averageScoreReport(message);
        }else if(args[1] == "average_day"){
            BotCommands.averageByDay(message);
        }else if(args[1] == "stonks" && (message.channel.name == "the-mahjong-den" || message.channel.guild.name != "NCMEL")){
            BotCommands.stonks(args[2], message);
        }else if(args[1] == "call" && args.length == 3){
            BotCommands.message.channel.send(`Ok ${message.member.user}! Calling ${args[2]} ...`)
        }else{
            BotCommands.reportVaderAnalysis(message, toAnalyze, intensity);
        }
        return;
    }
    BotCommands.processReply(message, chance, intensity["compound"], db);
});

app.engine('pug', require('pug').__express)
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'pug')

app.get('/', (req, res) => {
    logging.submit_log(`Home page requested`)
    db.get("SELECT AVG(score) as average FROM discovader", function(err, avg_row){
        db.all(`select strftime('%Y-%m-%d', timestamp) as DAY, avg(score) as SCORE from discovader group by strftime('%Y-%m-%d', timestamp) order by DAY`, function(err, rows){
            let stringList = [];
            for(value in rows){
                stringList.push({x: moment(rows[value].DAY).format("ll"), y: rows[value].SCORE})
            }
            // res.render('index', { average: avg_row.average , daily_average: rows, stringData: JSON.stringify(stringList)})
            res.sendFile(path.join(__dirname + "/index.html"))

        });
    });
})

app.get('//images/chuu.jpg', (req, res) => {
    res.sendFile(path.join(__dirname + '/images/chuu.jpg'));
})

app.get('//images/guwun.jpg', (req, res) => {
    res.sendFile(path.join(__dirname + '/images/guwun.jpg'));
})

app.get('/aita', (req, res) => {
    logging.submit_log(`AITA page requested`)
    axios.get('http://localhost:5000/aita')
        .then((response) => {
            res.sendFile("aita", {aita: response["data"]})
        })
        .catch((error) => {res.json(error)})
})

app.get('/daily', (req, res) => {
    axios.get("http://hub.mph.in.gov/api/3/action/datastore_search_sql?sql=SELECT%20SUM(%22COVID_COUNT%22)%20as%20COVID_COUNT%20from%20%2246b310b9-2f29-4a51-90dc-3886d9cf4ac1%22%20WHERE%20%22COUNTY_NAME%22%20LIKE%20%27Tippecanoe%27")
        .then((response) => {
            daily_channel.send(`hi! as of today, there are ${response["data"]["result"]["records"][0]["covid_count"]} cases of covid 19 in tippecanoe county`);
            res.send(`hi! as of today, there are ${response["data"]["result"]["records"][0]["covid_count"]} cases of covid 19 in tippecanoe county`)
        })
        .catch((error) => {res.json(error)})
})


app.get('//aita', (req, res) => {
    logging.submit_log(`AITA page requested`)
    axios.get('http://localhost:5000/aita')
        .then((response) => {
            res.render("aita", {aita: response["data"]})
        })
        .catch((error) => {res.json(error)})
})

app.get('//daily', (req, res) => {
    axios.get("http://hub.mph.in.gov/api/3/action/datastore_search_sql?sql=SELECT%20SUM(%22COVID_COUNT%22)%20as%20COVID_COUNT%20from%20%2246b310b9-2f29-4a51-90dc-3886d9cf4ac1%22%20WHERE%20%22COUNTY_NAME%22%20LIKE%20%27Tippecanoe%27")
        .then((response) => {
            daily_channel.send(`hi! as of today, there are ${response["data"]["result"]["records"][0]["covid_count"]} cases of covid 19 in tippecanoe county`);
            res.send(`hi! as of today, there are ${response["data"]["result"]["records"][0]["covid_count"]} cases of covid 19 in tippecanoe county`)
        })
        .catch((error) => {res.json(error)})
})


app.get('//datadump', (req, res) => {
	db.get("SELECT AVG(score) as average FROM discovader", function(err, avg_row){
        db.all(`select strftime('%Y-%m-%d', timestamp) as DAY, avg(score) as SCORE, count(score) as COUNT from discovader group by strftime('%Y-%m-%d', timestamp) order by DAY`, function(err, rows){
            let stringList = [];
            for(value in rows){
                momentDate = moment(rows[value].DAY)
                stringList.push({date: momentDate.format("ll"), month: parseInt(momentDate.format("MM")), day: parseInt(momentDate.format("DD")), score: rows[value].SCORE, count: rows[value].COUNT})
            }
            res.json(stringList)

        });
    });
})


app.listen(port, () => console.log(`Discovader is now listening on port ${port}!`))
