/*
var exec = require('child_process').exec;

exec('gcc test.c', function (error, username) {
    console.log('complie Success', username);
    var terminal = require('child_process').spawn('a.exe');
    terminal.stdin.setEncoding('utf8');
    terminal.stdin.write('5\n');
    terminal.stdout.on('data', function (data) {
        console.log('' + data);
    });
});
*/
var fs = require('fs');
var connect = require('connect');
var express = require('express');
var async = require('async');
var jade = require('jade');
var app = express();

var mongoose = require('mongoose');
var project = new mongoose.Schema({
    user_id: String,
    project: String,
    sourceName: String,
    code: String
}, {
    collection: 'project'
});

var homeworkQuestion = new mongoose.Schema({
    questionNum: Number,
    title: String,
    deadLine: Date,
    question: String,
    resultNum: Number
},{
    collection: 'question'
});

var homeworkAnswer = new mongoose.Schema({
    questionNum: Number,
    input: String,
    answer: String
}, {
    collection: 'questionAnswer'
});

var homework = new mongoose.Schema({
    user_id: String,
    questionNum: Number,
    sourceCode: String,
    result: Number
}, {
    collection: 'homework'
});

var project = mongoose.model('project', project);
var homeworkQuestion = mongoose.model('question', homeworkQuestion);
var homeworkAnswer = mongoose.model('questionAnswer', homeworkAnswer);
var homework = mongoose.model('homework', homework);

mongoose.connect('mongodb://localhost');

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: "1234567890QWERTY" }));
app.use(express.static(__dirname + '/'));
app.use(express.static(__dirname + '/js'));
app.use(express.static(__dirname + '/css'));

app.get('/login', function (req, res) {
    req.session.userId = req.query['id'];
    req.session.userAuth = '9';
    res.redirect('/home');
});

app.get('/home', function (req, res) {
    res.sendfile(__dirname + '/layout.html');
});

app.post('/inputQuestion', function (req, res) {
    var title = req.body.title;
    var deadLine = req.body.deadLine;
    var questionContent = req.body.question;
    var title = req.body.title;
    var resultNum = req.body.resultNum;

    var answer = req.body.answer;
    var input = req.body.input;

    async.waterfall([
        function (cb) {
            console.log(title);
            homeworkQuestion.count({}, function (err, count) {
                console.log(count);
                cb(null, count + 1);
            });
        },

        function (count, cb) {
            console.log('callback :' + count);
            console.log(questionContent);
            var data = ({
                questionNum: count,
                title: title,
                deadLine: deadLine,
                question: questionContent,
                resultNum: resultNum
            });

            var question = new homeworkQuestion(data);
            question.save(function (err) {
                if (err)
                    console.log('Fuck');

                console.log('Insert question');
            });

            data = ({
                questionNum: count,
                input: input,
                answer: answer
            });

            answer = new homeworkAnswer(data);
            answer.save(function (err) {
                if (err)
                    console.log('Fuck');

                console.log('Insert Answer');
            });
        }                               
    ]);
});

app.get('/submitHomework', function (req, res) {
    var questionNum = req.query['questionNum'];

    homeworkQuestion.find({ 'questionNum': questionNum }, function (err, questionData) {
        if (err)
            console.log('fuck');

        fs.readFile('submitHomework.jade', 'utf8', function (err, data) {
            var fn = jade.compile(data);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fn({
                questionData: questionData
            }));
        })
    });
});

app.post('/submitHomeworkCompile', function (req, res) {
    var userId = '2007011126';
    var questionNum = req.body.questionNum;
    var code = req.body.code;
    var fileName = "homeworkSource";

    if (code.indexOf("%26") != -1)
        code = code.replace(/%26/gi, "&");

    var dbData = ({
        user_id: userId,
        questionNum: questionNum,
        sourceCode: code,
        result: 0
    });

    var tmpHomework = new homework(dbData);
    homework.count({ 'questionNum': questionNum }, function (err, data) {
        if(data == 0)
            tmpHomework.save(function (err) {
                if (err)
                    console.log('Dont insert homeworkAnswer');
            });
    });
    homeworkAnswer.find({ 'questionNum': questionNum }, function (err, data) {
        var input = data[0].input.split("\n");
        var answer = data[0].answer.split("\n");
        var ok = 0;
        var terminal = new Array();
        async.waterfall([
            function (cb) {
                for (var i = 0; i < input.length; i++) {
                    cb(null, i, input.length-1);
                }
            },
            function (i, length) {
                fs.writeFile(fileName+".c", code, 'utf8', function (error) {
                    if (error)
                        console.log(error);
                    else {
                        var exec = require('child_process').exec;
                        var exeName = fileName + i;
                        var exeCommand = 'gcc -o' + exeName + " "+ fileName +".c";
                        exeName += ".exe";
                        exec(exeCommand, function (error) {
                            if (error) {
                                console.log(i + 'this error : ' + error);
                            } else {
                                terminal = require('child_process').spawn(exeName);
                                var tmp = input[i] + "\n";
                                terminal.stdin.setEncoding('utf-8');
                                terminal.stdin.resume();
                                terminal.stdin.write(tmp);
                                terminal.stdout.on('data', function (data) {
                                    if (data == answer[i]) {
                                        console.log('ok');
                                        ok++;
                                    } else {
                                        console.log('fail');
                                    }

                                    homework.find({ 'questionNum': questionNum }, function (err, data) {
                                        homework.update({ 'questionNum': questionNum }, { $set: { 'result': ok } }, function (err, data) {
                                            if (err)
                                                console.log(err);
                                        });
                                    });

                                    if (i == length) {
                                        res.send("ok");
                                    }
                                });
                                terminal.on('close', function (code) {
                                    console.log('child process exited with code ' + code);
                                });
                            }
                        });
                    }
                });
            }
        ]);
    });
});
app.get('/homework', function (req, res) {
    var id = '2007011126';
    var auth = '9';

    async.waterfall([
        function (cb) {
            homeworkQuestion.find({}, null, { sort: { questionNum: 1 } }, function (err, data) {
                if (err)
                    console.log('While found question, The Program face with error');

                cb(null, data);
            });
        },
        function (questionData, cb) {
            homework.find({ user_id: id }, null, {sort: {questionNum: 1}}, function (err, data) {
                if (err)
                    console.log('While found userHomework, The Program face with error');

                cb(null, questionData, data);
            });
        },
        function (questionData, homeworkData, cb) {
            fs.readFile('test.jade', 'utf8', function (err, data) {
                var fn = jade.compile(data);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(fn({
                    id: id,
                    auth: auth,
                    questionData: questionData,
                    homeworkData: homeworkData
                }));
            })
        }
    ]);
});

/*app.get일 경우 req.query['']를 통해서 parameter 받을 수 있음*/
app.get('/getList', function (req, res) {
    var sessionId = req.session.userId;
    project.find({ 'user_id': sessionId }, function (err, data) {
        res.send(data);
    });
});

app.post('/testAjax', function (req, res) {
    res.send('test');
});
app.post('/listAjax', function (req, res) {
    var type = req.body.type;
    var isOk = 'false';
    if (type == 'delete') {
        var _id = req.body._id;

        project.remove({ "_id": _id }, function (err, result) {
            if (err)
                console.log('delete fail');

            res.send('true');
        });
    } else if (type == 'insert') {
        var sourceName = req.body.sourceName;
        var id = req.session.userId;

        var test_data = ({
            user_id: id,
            sourceName: sourceName
        });

        var test = new project(test_data);
        test.save(function (err) {
            if (err)
                console.log('err');

            console.log('save complete');
            res.send('true&'+test._id);
        });
    }
});
var isExist = function isExistFunc(sourceName, id, callback){
    var id = id;
    var sourceName = sourceName;

    project.count({ 'sourceName': sourceName, 'user_id': id }, function (err, count) {
        callback(count);
    });
}

app.post('/compile', function (req, res) {
    var code = req.body.code;
    var sourceName = req.body.sourceName;
    var _id = req.body._id;
    console.log(_id);
    var fileName = 'text.c';

    if (code.indexOf("%26") != -1)
        code = code.replace("%26", "&");

    var test_data = ({
        user_id: req.session.userId,
        sourceName: sourceName,
        code: code
    });

    var test = new project(test_data);

    isExist(sourceName, req.session.userId, function (count) {
        if (count == 0) {
                test.save(function (err) {
                    if (err)
                        console.log('err');

                    console.log('save complete');
                });
        } else {
            project.update({ '_id': _id }, {$set: {'code': code} }, function (err, result) {
                if (err)
                    console.log('not found');

                console.log(result);
            });
        }
    });
    
    fs.writeFile(fileName, code, 'utf8', function (error) {
        if (error)
            console.log(error);
        else {
            var exec = require('child_process').exec;
            var exeCommand = 'gcc ' + fileName;

            exec(exeCommand, function (error, username) {
                if (error) {
                    //res.send('error');
                } else {
                    console.log('complie Success', username);
                    var terminal = require('child_process').spawn('a.exe');
                    terminal.stdin.setEncoding('utf8');
                    terminal.stdout.on('data', function (data) {
                        res.send(data );
                        console.log('' + data);
                    });
                }
            });
        }
    });
});

app.listen(80);
/*
app.get('/list', function (req, res) {
    res.sendfile(__dirname + '/projectList.html');
});

app.get('/getList', function (req, res) {
    project.find({ 'user_id': '2007011126' }, function (err, data) {
        console.log(data);
        res.send(data);
    });
});

app.get('/coding', function (req, res) {
    res.sendfile(__dirname + '/code.html');
});


app.get('/css', function (req, res) {
    res.sendfile(__dirname + '/css/jquery-ui-1.10.3.custom.css');
});

app.get('/page', function (req, res) {
    res.sendfile(__dirname + '/js/jquery.contextmenu.js');
});

app.get('/contextMenu', function (req, res) {
    res.sendfile(__dirname + '/js/jquery.contextmenu.js');
});

app.get('/contextCss', function (req, res) {
    res.sendfile(__dirname + '/css/contextmenu.css');
});
app.get('/query', function (req, res) {
    res.sendfile(__dirname + '/jquery/js/jquery-1.9.1.js');
});
app.get('/uiQuery', function (req, res) {
    res.sendfile(__dirname + '/jquery/js/jquery-ui-1.10.2.custom.js');
});

app.get('/test', function (req, res) {
    project.find({}, function (err, data) {
        console.log(data);
    });
});*/

/*
server.use(connect.router(function (app) {
    app.get('/Login', function (request, response) {
        if (request.cookies.auth = true) {
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end('<h1>Login Success</h1>');
        } else {
            fs.readFile('Login.html', function (error, data) {
                response.writeHead(200, { 'Content-Type': 'text/html' });
                response.end(data);
            });
        }
    });

    app.post('/Login', function (request, response) {
        if (request.body.id == id && request.body.password == password) {
            response.writeHead(302, {
                'Location': '/Login',
                'Set-Cookie': ['auth = true']
            });
        } else {
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end('<h1>Login FAIL</h1>');
        }
    });
}));

server.listen(52273, function () {
    console.log('server running at http://127.0.0.1:52273');
});*/