const vader = require('vader-sentiment');
const Discord = require('discord.js');
const express = require("express");
var sqlite3 = require('sqlite3').verbose();

require('dotenv').config()
const db = new sqlite3.Database(process.env.DATABASE);
const client = new Discord.Client();

const app = express();
const port = 3000

console.log("Starting up ...");
client.login("NzA1ODU1OTc0NDEzNTY1OTk0.Xqxxog.7QAwSV4ghKomK9Oo5UW41KAyYWc").then((token) => console.log(token));


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
        if(args[1] == "explain"){
            explain(message.channel);
        }else if(args[1] == "average"){
            averageScoreReport(message.channel);
        }else if(args[1] == "average_day"){
            averageByDay(message);
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
    messageChannel.send(`${client.user} is a Discord bot that implements VADER sentiment analysis. It scans for negative messages as they come in and responds based on RNG and whether the message is truly negative according to its VADER compound score.`)
}

function reportVaderAnalysis(message, toAnalyze, results){
    message.channel.send(`Analysis of "${toAnalyze}" sent by ${message.member.user}:\nPositive: ${results["pos"]}\nNeutral: ${results["neu"]}\nNegative: ${results["neg"]}\nComposite: ${results["compound"]}`);
}

function processReply(message, chance, compoundScore){
    db.run("INSERT INTO discovader VALUES (datetime('now'), ?)", compoundScore);
    if(chance > 0.8 && compoundScore <= -0.05){
        if(chance > 0.95){
            message.channel.send(`That's right onii-chan! ${message.member.user}`);            
        }else if(chance > 0.9){
            message.channel.send(`[ ${message.member.user} didn't like that ]`);
        }else{
            message.react("😠");
        }
    }
}

function averageScoreReport(messageChannel){
    db.get("SELECT AVG(score) as average FROM discovader", function(err, row){
        messageChannel.send(`The average sentiment score is ${row.average}.`);
    });
    db.get("SELECT AVG(score) as average from discovader where timestamp >= date('now', '-1 days') and timestamp < date('now')", function(err, row){
        console.log(err);
        messageChannel.send(`The average sentiment over the past 24 hours is ${row.average}`);
    });
}

function averageByDay(message){
    db.all("select strftime('%Y-%m-%d', timestamp) as DAY, avg(score) as SCORE from discovader group by strftime('%Y-%m-%d', timestamp)", function(err, rows){
        let total_average_string = `Hi ${message.member.user}, here's my day by day average:\n`;
        rows.forEach(element => {
            let formatted_score = (element.SCORE*100).toFixed(2) + '%';
            total_average_string += `${element.DAY}: ${formatted_score}\n`;
        });
        message.channel.send(total_average_string);
    })
}


// app.listen(port, () => console.log(`Discovader is now listening on port ${port}!`))