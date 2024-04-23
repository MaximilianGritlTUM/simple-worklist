const express = require('express');
const axios = require('axios');
const parser = require('xml2json');
const cors = require('cors')

const app = express ();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const PORT = process.env.PORT || 3000;
const dict = {}
const concernsSaved = {}

app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
});

app.post("/", (request, response) => {

    let cpee_instance_url = request.headers['cpee-instance-url'];
    let concerns = JSON.parse(('[' + request.body.concerns.slice(2,-2) + ']').replace(new RegExp('"concern": ', 'g'), ''));

    filterSubjects(cpee_instance_url, concerns).then(subject => {
        dict[subject.uid] = {}
        dict[subject.uid]["callback"] = request.headers['cpee-callback']
        dict[subject.uid]["label"] = request.headers['cpee-label']
        dict[subject.uid]["activity"] = request.headers['cpee-activity']
        dict[subject.uid]["instance"] = request.headers['cpee-instance']
        response.set('CPEE-CALLBACK', 'true')
        response.send()
        axios.put(dict[subject.uid]["callback"], {}, {headers: {
            "CPEE-UPDATE": "true",
            "CPEE-UPDATE-STATUS" : "assigned task to user "+subject.uid
        }})
    });
});

app.get("/tasks/*", (request, response) => {
    response.send(dict[request.params[0]])
})

app.delete("/tasks/*", (request, response) => {
    if (request.params[0] in dict) {
        axios.put(dict[request.params[0]]['callback'], {user : request.params[0]})
        delete dict[request.params[0]];
        response.send(true);
    }else{
        response.send(false);
    }
})

app.get("/tasks", (request, response) => {
    response.send(dict)
})

function filterSubjects(cpee_instance_url, concerns) {
    
    let foundSubjects = []
    let found = false

    let subject = axios.get(cpee_instance_url + '/properties/description').then(async resp => {
        let concernData = (JSON.parse(parser.toJson(resp.data))).description._concerns.concern;
        for (const concern of concerns) {
            for (const c of concernData) {
                if (concern.id == c.id) {
                    try {
                        const org = await axios.get(c.orgmodel)

                        if (cpee_instance_url in concernsSaved && concern.id in concernsSaved[cpee_instance_url]) {
                            if(c.type == "BOD") {
                                if (!found && (foundSubjects.length == 0 || foundSubjects.find(toFind => toFind.uid == concernsSaved[cpee_instance_url][concern.id]))) {
                                    foundSubjects = [concernsSaved[cpee_instance_url][concern.id]]
                                } else {
                                    foundSubjects = []
                                    found = true
                                }
                            }else if (c.type == "SOD"){
                                if (!found && foundSubjects.length == 0) {
                                    foundSubjects = JSON.parse(parser.toJson(org.data)).organisation.subjects.subject.filter(toFilter => toFilter.uid != concernsSaved[cpee_instance_url][concern.id].uid)
                                }else{
                                    foundSubjects = foundSubjects.filter(toFilter => toFilter.uid != concernsSaved[cpee_instance_url][concern.id])
                                }
                                if (foundSubjects.length == 0) {
                                    found = true
                                }
                            }
                        }

                        if (!found) {
                            if (foundSubjects.length > 0) {
                                let subjects = foundSubjects.filter(toFilter => {
                                    if (Array.isArray(toFilter.relation)){
                                        return toFilter.relation.find(toFind => toFind.role == c.role);
                                    }else{
                                        return toFilter.relation.role == c.role;
                                    }
                                });
    
                                foundSubjects = subjects;
                            }else {
                                let subjects = JSON.parse(parser.toJson(org.data)).organisation.subjects.subject.filter(toFilter => {
                                    if (Array.isArray(toFilter.relation)){
                                        return toFilter.relation.find(toFind => toFind.role == c.role);
                                    }else{
                                        return toFilter.relation.role == c.role;
                                    }
                                });
    
                                foundSubjects = subjects;

                            }
                            if (foundSubjects.len == 0) {
                                found = true;
                            }
                        }
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        }
        
        if (foundSubjects.length > 0 ){
            for (const subject of foundSubjects) {
                if (!(subject.uid in dict)) {
                    for (const concern of concerns) {
                        if (!(cpee_instance_url in concernsSaved)) {
                            concernsSaved[cpee_instance_url] = {}
                        }
                        if (!(concern.id in concernsSaved[cpee_instance_url])) {
                            concernsSaved[cpee_instance_url][concern.id] = subject
                        }
                    }
                    return subject
                }
            }
        }
    })

    return subject;
}
