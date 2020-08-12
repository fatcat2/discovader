const vader = require('vader-sentiment');
const Discord = require('discord.js');
const express = require("express");
const axios = require('axios').default;
const BotCommands = require("./utils/BotCommands");

var sqlite3 = require('sqlite3').verbose();
var path = require('path');
var moment = require('moment');

require('dotenv').config()

const db = new sqlite3.Database(process.env.DATABASE);
const client = new Discord.Client();

const app = express();
const port = 8888

console.log("Starting up ...");
client.login(process.env.LOGIN_TOKEN).then((token) => console.log(token));


client.once('ready', () => {
    console.log('Discovader successfully logged in to Discord!');
});

client.on('message', message => {
    if(message.member.id == client.user.id){
        console.log("bot-sent message");
        return;
    }

    if(message.content == "!aita"){
        axios.get('http://localhost:5000/aita')
        .then((response) => {message.channel.send(response["data"])})
    }

    let chance = Math.random();
    let toAnalyze = BotCommands.processIncomingMessage(message.content, client);

    let intensity = vader.SentimentIntensityAnalyzer.polarity_scores(toAnalyze);
    console.log(`chance: ${chance} score: ${intensity["compound"]}`);

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
    db.get("SELECT AVG(score) as average FROM discovader", function(err, avg_row){
        db.all(`select strftime('%Y-%m-%d', timestamp) as DAY, avg(score) as SCORE from discovader group by strftime('%Y-%m-%d', timestamp) order by DAY`, function(err, rows){
            let stringList = [];
            for(value in rows){
                console.log(value);
                stringList.push({x: moment(rows[value].DAY).format("ll"), y: rows[value].SCORE})
            }
            res.render('index', { average: avg_row.average , daily_average: rows, stringData: JSON.stringify(stringList)})

        });
    });
})

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname + '/favicon.ico'));
})

app.get('/aita', (req, res) => {
    axios.get('http://localhost:5000/aita')
        .then((response) => {
            res.render("aita", {aita: response["data"]})
        })
        .catch((error) => {res.json(error)})
})


app.listen(port, () => console.log(`Discovader is now listening on port ${port}!`))