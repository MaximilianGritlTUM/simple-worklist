const express = require('express');
const axios = require('axios');
const parser = require('xml2json');

const app = express ();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const dict = {}

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});

app.post("/", (request, response) => {
    let found = false
    let cpee_instance_url = request.headers['cpee-instance-url'];
    let concerns = JSON.parse(('[' + request.body.concerns.slice(2,-2) + ']').replace(new RegExp('"concern": ', 'g'), ''));
    axios.get(cpee_instance_url + '/properties/description').then(resp => {
        let concernData = (JSON.parse(parser.toJson(resp.data))).description._concerns.concern;
        concerns.forEach(function(concern) {
            concernData.forEach(function(c) {
                if (concern.id == c.id) {
                    axios.get(c.orgmodel).then(org => {
                        let subjects = JSON.parse(parser.toJson(org.data)).organisation.subjects.subject.filter(toFilter => {
                            if (Array.isArray(toFilter.relation)){
                                return toFilter.relation.find(toFind => toFind.role == c.role);
                            }else{
                                return toFilter.relation.role == c.role;
                            }
                        });

                        for (const [i, subject] of subjects.entries()) {
                            if (!found && !(subject.uid in dict)) {
                                dict[subject.uid] = []
                                dict[subject.uid].push(request.headers['cpee-callback'])
                                response.send(subject.uid);
                                found = true;
                            }
                        }

                    })
                }
            })
        })
    })
});

app.get("/dict", (request, response) => {
    response.send(dict)
})
