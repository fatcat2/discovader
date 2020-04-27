const vader = require('vader-sentiment');

const Discord = require('discord.js');
const express = require("express");
const client = new Discord.Client();
const app = express();

const port = 3000


client.once('ready', () => {
	console.log('Ready!');
});

client.login("NzA0MTE4MDE4MTI4NjA5NDEx.XqYjzg.wJC9iRGrfkiF_3e0arpgA2mqUN0");

client.on('message', message => {
    if(message.member.id == client.user.id){
        console.log("bot-sent message");
        return;
    }
    let chance = Math.random();
    let intensity = vader.SentimentIntensityAnalyzer.polarity_scores(message.content);
    console.log(`chance: ${chance} score: ${intensity["compound"]}`);


    if(chance > 0.5 && intensity["compound"] <= -0.05){
        if(chance > 0.9){
            message.channel.send(`That's right onii-chan! ${message.member.user}`);            
        }else if(chance > 0.7){
            message.channel.send(`[ ${message.member.user} didn't like that ]`);
        }else{
            message.react("😠");
        }
    }
});


// express.js section
app.get("/", (req, res) => {
	res.send("your mom");
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))