const vader = require('vader-sentiment');
const Discord = require('discord.js');
const express = require("express");
var sqlite3 = require('sqlite3').verbose();

require('dotenv').config()

console.log(process.env);
const db = new sqlite3.Database("/home/ryan/discord-vader/discovader.sqlite");
const client = new Discord.Client();

const app = express();
const port = 3000


client.once('ready', () => {
	console.log('Discovader successfully logged in to Discord!');
});

client.login(process.env.LOGIN_TOKEN);

client.on('message', message => {
    if(message.member.id == client.user.id){
        console.log("bot-sent message");
        return;
    }

    let chance = Math.random();
    let toAnalyze = processIncomingMessage(message.content);

    let intensity = vader.SentimentIntensityAnalyzer.polarity_scores(toAnalyze);
    console.log(`chance: ${chance} score: ${intensity["compound"]}`);

    if(message.content.includes(client.user.id)){
        if(toAnalyze == "explain"){
            explain(message.channel);
        }else if(toAnalyze == "average"){
            averageScoreReport(message.channel);
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
    if(chance > 0.7 && compoundScore <= -0.05){
        if(chance > 0.9){
            message.channel.send(`That's right onii-chan! ${message.member.user}`);            
        }else if(chance > 0.8){
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
}

app.listen(port, () => console.log(`Discovader is now listening on port ${port}!`))