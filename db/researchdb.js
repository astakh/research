const mongodb   = require('mongodb');
const mongoose  = require('mongoose'); 
const func      = require('../functions');
require('dotenv').config();

const db        = process.env.DBPATH; 
mongoose
.connect(db)
.then((res) => console.log('Connected to DB'))
.catch((err) => console.log(err));
const Schema = mongoose.Schema; 

const researchSchema = new Schema ({
        name:   { type: String, },
        start:  { type: String, },
        time:   { type: Number, },
    }, {timestamps: true});
    const Research = mongoose.model('Research', researchSchema); 

    async function addResearch(research) {
    let r = new Research({
        name:   research.name,
        start:  research.start.toISOString(),
        time:   (new Date() - research.start) / 10000 / 60 / 60,
    }); 
    console.log(r)
    await r.save();
}


module.exports.addResearch           = addResearch;
