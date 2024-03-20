const express = require('express');
const http = require('http');
const parser = require('xml2json');

const app = express ();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});

app.post("/", (request, response) => {
    let cpee_instance_url = request.headers['cpee-instance-url'];
    let concerns = JSON.parse(('[' + request.body.concerns.slice(2,-2) + ']').replace(new RegExp('"concern": ', 'g'), ''));
    http.get(cpee_instance_url + '/properties/description', (resp) => {
        let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        })

        resp.on('end', () => {
            let concernData = (JSON.parse(parser.toJson(data))).description._concerns.concern;
            concerns.forEach(function(concern) {
                concernData.forEach(function(c) {
                    if (concern.id == c.id) {
                        console.log(c)
                    }
                })
            })
        })
    })
});
