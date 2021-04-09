// 라이브러리 추가 및 메소드 사용을 위한 객체 생성
var express = require("express");
var schedule = require("node-schedule");
var mosca = require("mosca");
var mqtt = require("mqtt");
var mysql = require("mysql");
var dbconfig = require("./database.js");
var connection = mysql.createConnection(dbconfig);

// python 파일 실행 라이브러리 
const spawn = require('child_process').spawn;

const _ = require('lodash');

var app = express();
var http = require("http").createServer(app);

var res_StartHours = [];
var res_StartMinutes = [];
var res_Days = [];
var res_Controls= [];
var res = [res_StartHours, res_StartMinutes, res_Days, res_Controls];
var schedules = [];

// mosca mqtt 서버 설정
var settings = {
  port: 1883,
  bundle: true,
  persistence: mosca.persistence.Memory,
  static: './public'
};
// mosca 서버 생성
var server = new mosca.Server(settings, function(){
  console.log("Mosca server is up and running");
});
// 클라이언트가 연결되었을 때
server.clientConnected = function(clinet){
  console.log("client connected", client.id);
}
server.published = function(packet, client, cb) {
 
  if (packet.topic.indexOf('echo') === 0) {
    //console.log('ON PUBLISHED', packet.payload.toString(), 'on topic', packet.topic);
    return cb();
  }
  var newPacket = {
    topic: 'echo/' + packet.topic,
    payload: packet.payload,
    retain: packet.retain,
    qos: packet.qos
  };
 
  console.log('newPacket', newPacket);
 
  server.publish(newPacket, cb);
 
};

var client = mqtt.connect("mqtt://localhost");  // Client 생성

client.on('connect', function () {  // MQTT 서버에 연결되었을 때
  client.subscribe('client/connect');
  client.subscribe('Reservation/add');
  client.subscribe('Reservation/del');
  client.subscribe('Curtain/ctr');
  client.subscribe('Reservation/list');
  client.subscribe('Reservation/check');
  client.subscribe('Database/bright/save');
  client.subscribe('Auto/control');

});

// MQTT Architecture
client.on('message', function (topic, message) { // Node.js에서 수신된 데이터 처리
  if(topic == 'client/connect'){  // 안드로이드 clinet가 연결되었을 때
    console.log(message.toString());
    // 예약 리스트 송신
    connection.query('SELECT * FROM `control`', function(err, rows) {
      if(err) throw err;
      console.log('Success!');
      client.publish('Reservation/list', JSON.stringify(rows));
    });
     ////조도 in/out/avg 데이터 송신
     connection.query('SELECT * FROM (SELECT * FROM brightness ORDER BY `time` DESC LIMIT 10) AS a ORDER BY `time` ASC', function(err, rows) {
      if(err) throw err;
      console.log(JSON.stringify(rows));
      client.publish('Luxdata/avg2', JSON.stringify(rows));
    });    
    
  }
  else if(topic == 'Reservation/add'){
    // DB에 예약 추가
    var data = message.toString().split('|');
    console.log(data);
    /*
    connection.query('SELECT `Name` FROM `control` WHERE `Name`="' + data[0] + '";', function(err, rows) {
      if(err) throw err;
      console.log(JSON.stringify(rows));
    });
    
    console.log(message.toString());
    */
    // DB에 데이터 삽입 
    connection.query('INSERT INTO `control`(`Name`, `StartTime`, `dayofweek`, `ctr`, `Memo`) VALUES("'
    + data[0] + '", "' + data[1] + '", "' + data[2] + '", ' + data[3] + ', "' + data[4] + '") ON DUPLICATE KEY '
     + 'UPDATE `StartTime` = "' + data[1] + '", `dayofweek` = "' + data[2] + '", `ctr` = "' + data[3] + '", `Memo` = "'
       + data[4] +'";', function(err, rows) {
      if(err){
        client.publish('Reservaion/add/fail', "");
      }else{
        client.publish('Reservation/add/success', "");
        console.log('Success!');
        res_checker();
      }
    });
    
  }
  else if(topic == 'Reservation/del'){
    connection.query('DELETE FROM `control` WHERE `Name` IN (' + message.toString() + ')', function(err, rows) {
      if(err){
        client.publish('Reservation/del/fail', "");
      }
      else{
        client.publish('Reservation/del/success', "");
        res_checker();
      }
    });
  }

  else if(topic == 'Curtain/ctr'){
    // 안드로이드 앱에서 커튼 단계 제어 버튼을 눌렀을 때
        console.log(message.toString());
  }
  else if(topic == 'Reservation/check'){
    // 예약 활성화/비활성화
    var chk = message.toString().split('|');
    connection.query('UPDATE control SET chk_state = ' + chk[1] + ' WHERE NAME = "' + chk[0] +'";', function(err, rows) {
      if(err) throw err;
      res_checker();
      console.log('Success!');
    });

    console.log(chk);
  }
  else if(topic == 'Database/bright/save'){
    // 새로운 데이터베이스 활성화 했음 
    var data = message.toString().split('|');
    connection.query('INSERT INTO brightness VALUES("' + data[0] + '", ' + data[1] + ', ' + data[2] + ') ;', function(err, rows) {
      if(err) throw err;
      console.log('Success!');
    });

    console.log(chk);
  }
  else if(topic == 'Auto/control'){
    console.log(message.toString());

    // 자동 제어 파이썬 실행

    // 일정 시각마다 실행 스케줄 on
    if(message.toString() == '1'){
      let autoSchedule = schedule.scheduleJob('auto', '*/5 * * * * *', function() {
        const result = spawn('python' , ['main.py']);
        result.stdout.on('data', function(data) { 
        console.log(data.toString());
        }); 
          // 4. 에러 발생 시, stderr의 'data'이벤트리스너로 
          //실행결과를 받는다. 
        result.stderr.on('data', function(data) { 
          console.log(data.toString()); });
      });
    }
    else{
      var jobNames = _.keys(schedule.scheduledJobs);
      for(let name of jobNames){
        if (name == 'auto'){
         schedule.cancelJob(name);
        }
      }
    }

    /*
    const result = spawn('python' , ['main.py']);
    result.stdout.on('data', function(data) { 
      console.log(data.toString());
     }); 
      // 4. 에러 발생 시, stderr의 'data'이벤트리스너로 
      //실행결과를 받는다. 
    result.stderr.on('data', function(data) { 
      console.log(data.toString()); });
      */
  }
});
//data test
/*
function getTimeStamp() {
  var d = new Date();
  var s =
    leadingZeros(d.getFullYear(), 4) + '-' +
    leadingZeros(d.getMonth() + 1, 2) + '-' +
    leadingZeros(d.getDate(), 2) + ' ' +

    leadingZeros(d.getHours(), 2) + ':' +
    leadingZeros(d.getMinutes(), 2) + ':' +
    leadingZeros(d.getSeconds(), 2);

  return s;
}

function getHourStamp() {
  var d = new Date();
  var s =
    leadingZeros(d.getFullYear(), 4) + '-' +
    leadingZeros(d.getMonth() + 1, 2) + '-' +
    leadingZeros(d.getDate(), 2) + ' ' +

    leadingZeros(d.getHours(), 2) + ':' +
    leadingZeros(d.getMinutes(), 2) + ':00';
    //':00:00'

  return s;
}

function leadingZeros(n, digits) {
  var zero = '';
  n = n.toString();

  if (n.length < digits) {
    for (i = 0; i < digits - n.length; i++)
      zero += '0';
  }
  return zero + n;
}
*/


function res_checker(){
  connection.query('SELECT `StartTime`, `ctr`, `dayofweek` FROM `control` WHERE chk_state = 1', function(err, rows) { //WHERE `chk_state` = 1
    if(err) throw err;
    // 예약 리스트 비우기
    res_StartHours = [];
    res_StartMinutes = [];
    res_Days = [];
    res_Controls= [];
    res = [res_StartHours, res_StartMinutes, res_Days, res_Controls];

    //모든 예약 취소
    var jobNames = _.keys(schedule.scheduledJobs);
    for(let name of jobNames){
      if (name != 'auto'){
        schedule.cancelJob(name);
      }
    }

    console.log("afdafafad" + schedules);
    schedules = [];
    var data = JSON.parse(JSON.stringify(rows));

    for(var i = 0; i < data.length; i++){
      res_StartHours.push(data[i].StartTime.split(':')[0]);
      res_StartMinutes.push(data[i].StartTime.split(':')[1]);
      //res_StartTimes[i] = data[i].StartTime;
      res_Days.push(day_parser(data[i].dayofweek));
      res_Controls.push(data[i].ctr);
    

      var rule = new schedule.RecurrenceRule();
      rule.dayOfWeek = [res_Days[i].split(', ').map(Number)];
      rule.hour = Number(res_StartHours[i]);
      rule.minute = Number(res_StartMinutes[i]);

      let ctr = res_Controls[i];

      console.log(res_Days[i].split(', ').map(Number));
      schedules.push(schedule.scheduleJob(String(i), rule, function(){ //시간마다
        client.publish('asdft', ctr.toString());
      }));
    
    }
    console.log(res);
    console.log(schedules);

  });

}

function day_parser(sql_day){
  var day = ['0', '1', '2', '3', '4', '5', '6'];
  var str = ''
  for(var i = 0; i < sql_day.length; i++){
    if(sql_day.charAt(i) == '1'){
      str = str + day[i] + ', ';
    }
  }
  str = str.slice(0, -2);

  return str;
}




// 3000번 포트로 서버 열기
http.listen(3000, function(){
   console.log("listening on * 3000");
   console.log(res_checker());
});



