const vader = require('vader-sentiment');
const Discord = require('discord.js');
const express = require("express");
const axios = require('axios').default;
var sqlite3 = require('sqlite3').verbose();
var path = require('path');

var moment = require('moment'); // require
moment().format();

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

    let chance = Math.random();
    let toAnalyze = processIncomingMessage(message.content);

    let intensity = vader.SentimentIntensityAnalyzer.polarity_scores(toAnalyze);
    console.log(`chance: ${chance} score: ${intensity["compound"]}`);

    if(message.content.split(" ")[0].includes(client.user.id)){
        let args = message.content.split(" ");
        args[1] = args[1].toLowerCase();
        if(args[1] == "explain"){
            explain(message.channel);
        }else if(args[1] == "average"){
            averageScoreReport(message);
        }else if(args[1] == "average_day"){
            averageByDay(message);
        }else if(args[1] == "stonks" && (message.channel.name == "the-mahjong-den" || message.channel.guild.name != "NCMEL")){
            stonks(args[2], message);
        }else if(args[1] == "call" && args.length == 3){
            message.channel.send(`Ok ${message.member.user}! Calling ${args[2]} ...`)
        }else{
            reportVaderAnalysis(message, toAnalyze, intensity);
        }
        return;
    }

    processReply(message, chance, intensity["compound"]);
});

function processIncomingMessage(message){
    if(message.includes(client.user.id)){
        return message.substring(client.user.id.length+4).trim();
    }
    return message;
}

function explain(messageChannel){
    messageChannel.send(`${client.user} is a Discord bot that implements VADER sentiment analysis. It scans for negative messages as they come in and responds based on RNG and whether the message is truly negative according to its VADER compound score.\nCommands are \`explain\`, \`average\`, \`call <number>\`, \`stonks <ticker symbol>\`, and \`average_day\`.`)
}

function reportVaderAnalysis(message, toAnalyze, results){
    message.channel.send(`Analysis of "${toAnalyze}" sent by ${message.member.user}:\nPositive: ${results["pos"]}\nNeutral: ${results["neu"]}\nNegative: ${results["neg"]}\nComposite: ${results["compound"]}`);
}

function processReply(message, chance, compoundScore){
    db.serialize(function(){
        let formatted_guild_name = regex(message.channel.guild.name).replace(/\s+/g, '');
        db.run(`CREATE TABLE IF NOT EXISTS ${formatted_guild_name} (timestamp text, score real)`);
        db.run(`INSERT INTO ${formatted_guild_name} VALUES (datetime('now'), ?)`, compoundScore);
        db.run(`INSERT INTO discovader VALUES (datetime('now'), ?)`, compoundScore);
    });
    // This section is purely for cbun because cbun complains all the damn time 
    // and I'm fucking sick of it.
    if(message.member.nickname == "cbun"){
        if(chance > 0.99 && compoundScore <= -0.05){
            message.channel.send(`Awwww ${message.member.user}, you'll be ok sister.`);
        }else if(chance > 0.99 && compoundScore >= 0.05){
            message.channel.send(`OMG yaaassss 🤩 slay kweeeen 👑`);
        }
        return;
    }

    if(chance > 0.9 && compoundScore <= -0.05){
        if(chance > 0.975){
            message.channel.send(`That's right onii-chan! ${message.member.user}`);            
        }else if(chance > 0.95){
            message.channel.send(`[ ${message.member.user} didn't like that ]`);
        }else{
            message.react("😠");
        }
    }
}

function averageScoreReport(message){
    let formatted_guild_name = regex(message.channel.guild.name).replace(/\s+/g, '');
    db.get(`SELECT AVG(score) as average FROM ${formatted_guild_name}`, function(err, row){
        message.channel.send(`The average sentiment score is ${row.average}.`);
    });
    db.get(`SELECT AVG(score) as average from ${formatted_guild_name} where timestamp >= date('now', '-1 days') and timestamp < date('now')`, function(err, row){
        console.log(err);
        message.channel.send(`The average sentiment over the past 24 hours is ${row.average}`);
    });
}

function averageByDay(message){
    let formatted_guild_name = regex(message.channel.guild.name).replace(/\s+/g, '');
    db.all(`select strftime('%Y-%m-%d', timestamp) as DAY, avg(score) as SCORE from ${formatted_guild_name} group by strftime('%Y-%m-%d', timestamp)`, function(err, rows){
        let total_average_string = `Hi ${message.member.user}, here's my day by day average for ${message.channel.guild.name}:\n\`\`\``;
        rows.forEach(element => {
            let formatted_score = (element.SCORE).toFixed(5);
            var sentiment = "";
            if(element.score*100 > 5){
                sentiment = "😁";
            }else if(element.score*100 <= 5 && element.score*100 >= -5){
                sentiment = "😐";
            }else{
                sentiment = "😢";
            }
            total_average_string += `${element.DAY}: ${formatted_score}\n`;
        });
        total_average_string += "```";
        message.channel.send(total_average_string);
    })
}

function stonks(symbol, message){
    axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.STONKS}`)
        .then((response) => {
            let current_price = response["data"]["c"];
            let high_price = response.data.h;
            let low_price = response.data.l;
            let prev_close = response.data.pc;
            message.channel.send(`Hey ${message.member.user}! Here's the current info for ${symbol}.\nPrice: ${current_price}\nHigh: ${high_price}\tLow: ${low_price}\nPrevious close: ${prev_close}`)
        })
        .catch((err) => {
            message.channel.send(`Sorry ${message.member.user}, I couldn't find the symbol ${symbol}.`);
        })
}

function regex (str) {
    return str.replace(/(~|`|!|@|#|$|%|^|&|\*|\(|\)|{|}|\[|\]|;|:|\"|'|<|,|\.|>|\?|\/|\\|\||-|_|\+|=)/g,"")
}

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


app.listen(port, () => console.log(`Discovader is now listening on port ${port}!`))