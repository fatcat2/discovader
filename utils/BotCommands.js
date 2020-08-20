const axios = require('axios').default;
const vader = require('vader-sentiment');
const logging = require("./Logging");

function processIncomingMessage(message, client){
    if(message.includes(client.user.id)){
        return message.substring(client.user.id.length+4).trim();
    }
    return message;
}

function explain(messageChannel, client){
    messageChannel.send(`${client.user} is a Discord bot that implements VADER sentiment analysis. It scans for negative messages as they come in and responds based on RNG and whether the message is truly negative according to its VADER compound score.\nCommands are \`explain\`, \`average\`, \`call <number>\`, \`stonks <ticker symbol>\`, and \`average_day\`.`)
}

function reportVaderAnalysis(message, toAnalyze, results){
    message.channel.send(`Analysis of "${toAnalyze}" sent by ${message.member.user}:\nPositive: ${results["pos"]}\nNeutral: ${results["neu"]}\nNegative: ${results["neg"]}\nComposite: ${results["compound"]}`);
}

function processReply(message, chance, compoundScore, db){
    db.serialize(function(){
        let formatted_guild_name = regex(message.channel.guild.name).replace(/\s+/g, '');
        db.run(`CREATE TABLE IF NOT EXISTS ${formatted_guild_name} (timestamp text, score real)`);
        db.run(`INSERT INTO ${formatted_guild_name} VALUES (datetime('now'), ?)`, compoundScore);
        db.run(`INSERT INTO discovader VALUES (datetime('now'), ?)`, compoundScore);
    });

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

exports.averageByDay = averageByDay
exports.averageScoreReport = averageScoreReport
exports.explain = explain
exports.processIncomingMessage = processIncomingMessage
exports.processReply = processReply
exports.regex = regex
exports.reportVaderAnalysis = reportVaderAnalysis
exports.stonks = stonks