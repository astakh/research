const ccxt = require ('ccxt');
const axios = require ('axios');
const db    = require('./db/researchdb');
const wd    = require('./wavesmatcher');
const func  = require('./functions');
require('dotenv').config();
const WebSocket = require('ws');
let bws = new WebSocket('wss://stream.binance.com:9443/ws/wavesusdt@bookTicker');

bws.onmessage = (event) => {
    let sockObj = JSON.parse(event.data);
    l.bidPrice = parseFloat(sockObj.b);
    l.askPrice = parseFloat(sockObj.a);
    l.avgPrice = (l.bidPrice + l.askPrice) / 2;
    //console.log(`WAVESUSDT bid: ${sockObj.b}, ask: ${sockObj.a}`);
}
var l = {bidPrice: 0, askPrice: 0, avgPrice: 0};
const binance   = new ccxt.binance(         { apiKey: process.env.BINANCE_API_KEY,  secret: process.env.BINANCE_API_SECRET });
const wavesdex  = new ccxt.wavesexchange(   { apiKey: process.env.WAVESDEX_API_KEY, secret: process.env.WAVESDEX_API_SECRET });

async function getScopes() {
    let t       = new Date();
    const r     = await func.getOrdersDirect('wavesdex', 'WAVES', 'DG2xFkPdDwKUoBkzGAhQtLpSGzfXLiCYPEzeKH2Ad24p', botsAmount);
    let res     = {}; 
    //console.log(l.askPrice, l.bidPrice, r.askPrice, r.bidPrice);
    if (l.askPrice>0 && r.askPrice>0) {
        res.buy     = (r.bidPrice/rate - l.askPrice) / l.askPrice * 100;
        res.sell    = (l.bidPrice - r.askPrice/rate) / r.askPrice/rate * 100;
        //console.log(res.sell, res.buy);
        res.bidLeft = l.bidPrice;
        res.askLeft = l.askPrice;
        res.bidRigh = r.bidPrice;
        res.askRigh = r.askPrice; 
        res.time    = new Date() - t;
        res.timeR   = r.time;
        res.timeL   = 0//l.time;
        //await db.addScope(res.sell, res.buy);
        return res;
    }
    else {
        res.buy     = 0;
        res.sell    = 0;
        res.bidLeft = 0;
        res.askLeft = 0;
        res.bidRigh = 0;
        res.askRigh = 0; 
        res.time    = new Date() - t;
        return res;
    }
}


let bots        = [];
bots.push({name: '0.3', stage: 0, disbalLeft: 0.3, disbalRigh: 0.3, rateLeft: 1, rateRigh: 1, amount: 100});
bots.push({name: '0.5', stage: 0, disbalLeft: 0.5, disbalRigh: 0.5, rateLeft: 1, rateRigh: 1, amount: 100});
bots.push({name: '0.7', stage: 0, disbalLeft: 0.7, disbalRigh: 0.7, rateLeft: 1, rateRigh: 1, amount: 100});
bots.push({name: '0.9', stage: 0, disbalLeft: 0.9, disbalRigh: 0.9, rateLeft: 1, rateRigh: 1, amount: 100}); 
let botsAmount  = 100;
let research    = [];
research[0]     = {};
research[1]     = {};
research[2]     = {};
research[3]     = {};
research[4]     = {};
research[5]     = {};
let scope       = {};
async function setRate() {
    let market = await func.getOrdersDirect('wavesdex', '34N9YcEETLWn93qYQ64EsP1x89tSruJU44RrEMSXXEPJ', 'DG2xFkPdDwKUoBkzGAhQtLpSGzfXLiCYPEzeKH2Ad24p', 200);
    console.log(`USDT/USDN: ${parseFloat((market.avgPrice)/100).toFixed(4)} `);
    return parseFloat(market.avgPrice)/100;
}
async function handleBot(ind, scope) {
    if (bots[ind].stage == 0) { // 
        //console.log(ind, scope.sell, bots[ind].disbalLeft, bots[ind].disbalRigh);
        if (scope.sell > bots[ind].disbalLeft) { // ready to sell from left and buy to right
            console.log('Sell deal' + bots[ind].name);
            research[ind].start = Date.now();
            research[ind].name  = bots[ind].name;
            bots[ind].stage   = 1;
        }
    }
    if (bots[ind].stage == 1) { // looking for scope to sell from right and buy to left 
        if (scope.buy > bots[ind].disbalRigh) { // ready to sell  from right and buy to left
            bots[ind].stage               = 0;
            console.log('Buy deal' + bots[ind].name);
            await db.addResearch(research[ind]);
        }
    }

}

let round = 0; 
let rate  = 0;
let testScope = [{buy: 0, sell: 0.5}, {buy: 0.5, sell: 0}];
async function botLoop() { 

    while(true) {
        if ((round % 25) == 0) { rate = await setRate(); console.log(rate); }
        scope = await getScopes();
        //scope = testScope[round]; 
        console.log(`Round: ${round} || ${func.nowTime()} || Scope: sell: ${scope.sell.toFixed(4)} || Scope: buy: ${scope.buy.toFixed(4)} `);

        for (var i = 0; i < bots.length; i++ ){
            await handleBot(i, scope);
            await func.sleep(1000);
        }

        round++;

        
    }
}

botLoop();

