const Influx = require('influx');

const influx = new Influx.InfluxDB(
    {
        database: 'mydb',
        host: 'localhost'
    }
)

function submit_log(message){
    // influx.writePoints([
    //     {
    //     measurement: "logs",
    //     fields: { message: message },
    //     }
    // ]).then(() => {
    //     console.log("Log submitted to DB")
    // }).catch((err) => {
    //     console.log(err)
    // })
    console.log(message)
}

exports.submit_log = submit_log