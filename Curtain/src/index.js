// 라이브러리 추가 및 메소드 사용을 위한 객체 생성
var express = require("express");
var schedule = require("node-schedule");

var mysql = require("mysql");
var dbconfig = require("./database.js");
var connection = mysql.createConnection(dbconfig);
var aedes = require('aedes')();
// python 파일 실행 라이브러리 
const spawn = require('child_process').spawn;

const _ = require('lodash');

var app = express();
var http = require("http").createServer(app);
var server = require('net').createServer(aedes.handle);

// 예약 정보들
var res_StartHours = [];
var res_StartMinutes = [];
var res_Days = [];
var res_Controls = [];
var res_LedColor = [];
var res_LedBright = [];
var res = [res_StartHours, res_StartMinutes, res_Days, res_Controls, res_LedColor, res_LedBright];
var schedules = [];

var auto_step = '0';
var personIn = false;

// MQTT Broker Server(Aedes)
var port = 1883;
server.listen(port, function () {
	console.log('aedes server on port : ', port);
});
// helper function to log date+text to console:
const log = (text) => {
	console.log(`[${new Date().toLocaleString()}] ${text}`)
}

// client connection event:
aedes.on('client', (client) => {
	let message = `Client ${client.id} just connected`
	log(message)
}
)
// client disconnection event
aedes.on('clientDisconnect', (client) => {
	let message = `Client ${client.id} just DisConnected`
	log(message)
}
)

// 5초마다 현재 방안 조도 송신
var luxnow = schedule.scheduleJob('luxnow', '*/5 * * * * *', function () { //시간마다
	connection.query('SELECT * FROM (SELECT * FROM brightness ORDER BY `time` DESC LIMIT 10) AS a ORDER BY `time` ASC', function (err, rows) {
		if (err) throw err;
		aedes.publish({
			topic: 'lux/graph',
			payload: JSON.stringify(rows)
		});
	});

});


// 예약 리스트 송신
aedes.subscribe('rsv/req', function (packet, cb) {
	console.log(packet.payload.toString());
	connection.query('SELECT * FROM `control`', function (err, rows) {
		if (err) throw err;
		console.log('Success!');
		aedes.publish({
			topic: 'rsv/list',
			payload: JSON.stringify(rows)
		});
	});
	connection.query('SELECT * FROM (SELECT * FROM brightness ORDER BY `time` DESC LIMIT 10) AS a ORDER BY `time` ASC', function (err, rows) {
		if (err) throw err;
		aedes.publish({
			topic: 'lux/graph',
			payload: JSON.stringify(rows)
		});
	});
	aedes.publish({
			topic: 'auto/step',
			payload: auto_step
		});
});


// DB에 예약 추가
aedes.subscribe('rsv/addreq', function (packet, cb) {
	var data = packet.payload.toString().split('|');
	console.log(data);
	// DB에 데이터 삽입 
	connection.query('INSERT INTO `control`(`Name`, `StartTime`, `dayofweek`, `ctr`, `led`, `Memo`) VALUES("'
		+ data[0] + '", "' + data[1] + '", "' + data[2] + '", ' + data[3] + ', "' + data[4] + '", "' + data[5] + '") ON DUPLICATE KEY '
		+ 'UPDATE `StartTime` = "' + data[1] + '", `dayofweek` = "' + data[2] + '", `ctr` = "' + data[3] + '", `led` = "' + data[4] + '", `Memo` = "'
		+ data[5] + '";', function (err, rows) {
			if (err) {
				aedes.publish({
					topic: 'rsv/addres',
					payload: "fail"
				});
			} else {
				aedes.publish({
					topic: 'rsv/addres',
					payload: "success"
				});
				console.log('Success!');
				res_checker();
			}
		});

});

// 예약 삭제
aedes.subscribe('rsv/delreq', function (packet, cb) {
	console.log(packet.payload.toString());
	connection.query('DELETE FROM `control` WHERE `Name` IN (' + packet.payload.toString() + ')', function (err, rows) {
		if (err) {
			aedes.publish({
				topic: 'rsv/delres',
				payload: "fail"
			});
		}
		else {
			aedes.publish({
				topic: 'rsv/delres',

				payload: "success"
			});
			res_checker();
		}
	});
});

aedes.subscribe('ctn/step', function (packet, cb) {
	// 안드로이드 앱에서 커튼 단계 제어 버튼을 눌렀을 때
	console.log(packet.payload.toString());
	var jobNames = _.keys(schedule.scheduledJobs);
	for (let name of jobNames) {
		if (name == 'auto') {
			schedule.cancelJob(name);
		}
	}
});
aedes.subscribe('ctrled', function (packet, cb) {
	// led 테스트
	console.log(packet.payload.toString());
	
});

aedes.subscribe('rsv/check', function (packet, cb) {
	// 예약 활성화/비활성화
	var chk = packet.payload.toString().split('|');
	connection.query('UPDATE control SET chk_state = ' + chk[1] + ' WHERE NAME = "' + chk[0] + '";', function (err, rows) {
		if (err) throw err;
		res_checker();
		console.log('Success!');
	});

	console.log(chk);
});

aedes.subscribe('Database/bright/save', function (packet, cb) {
	// 라즈베리파이 -> DB 조도 센서값 전달 
	var data = packet.payload.toString().split('|');
	connection.query('INSERT INTO brightness VALUES("' + data[0] + '", ' + data[1] + ', ' + data[2] + ') ;', function (err, rows) {
		if (err) throw err;
		console.log('Success!');
	});

	console.log(chk);
});

// 자동 제어 파이썬 실행
aedes.subscribe('auto/ctr', function (packet, cb) {
	console.log(packet.payload.toString());
	auto_step = packet.payload.toString();
	var jobNames = _.keys(schedule.scheduledJobs);
	for (let name of jobNames) {
		if (name == 'auto') {
			schedule.cancelJob(name);
		}

	}
	// 일정 시각마다 실행 스케줄 on
	if (packet.payload.toString() != '0') {
		let autoSchedule = schedule.scheduleJob('auto', '*/5 * * * * *', function () {
			const result = spawn('python', ['main.py', packet.payload.toString()]);
			result.stdout.on('data', function (data) {
				console.log(data.toString());
				aedes.publish({
					topic: "auto/result",
					payload: data.toString()
				});
			});
			// 4. 에러 발생 시, stderr의 'data'이벤트리스너로 
			//실행결과를 받는다. 
			result.stderr.on('data', function (data) {
				console.log(data.toString());
			});
		});
	}

});
aedes.subscribe('auto/person', function (packet, cb) {
	// 안드로이드 앱에서 커튼 단계 제어 버튼을 눌렀을 때
	console.log(packet.payload.toString());
	
});
aedes.subscribe('led/color', function (packet, cb) {
	console.log(packet.payload.toString());
	
});
// 예약 리스트 갱신 함수
function res_checker() {
	connection.query('SELECT `StartTime`, `ctr`, `dayofweek`, `led` FROM `control` WHERE chk_state = 1', function (err, rows) { //WHERE `chk_state` = 1
		if (err) throw err;
		// 예약 리스트 비우기
		res_StartHours = [];
		res_StartMinutes = [];
		res_Days = [];
		res_Controls = [];
		res_LedColor = [];
		res_LedBright = [];
		res = [res_StartHours, res_StartMinutes, res_Days, res_Controls, res_LedColor, res_LedBright];

		//모든 예약 취소
		var jobNames = _.keys(schedule.scheduledJobs);
		for (let name of jobNames) {
			if (name == 'auto' || name == 'luxnow') {
				continue;
			}
			else {
				schedule.cancelJob(name);
			}
		}

		console.log("afdafafad" + schedules);
		schedules = [];
		var data = JSON.parse(JSON.stringify(rows));
		console.log(JSON.stringify(rows));
		for (var i = 0; i < data.length; i++) {

			time = data[i].StartTime.split(':');
			res_StartHours.push(time[0]);
			res_StartMinutes.push(time[1]);

			//res_StartTimes[i] = data[i].StartTime;
			res_Days.push(day_parser(data[i].dayofweek));
			res_Controls.push(data[i].ctr);

			led = data[i].led.split(',');
			res_LedColor.push(led[1]);
			res_LedBright.push(led[0]);


			var rule = new schedule.RecurrenceRule();
			rule.dayOfWeek = [res_Days[i].split(', ').map(Number)];
			rule.hour = Number(res_StartHours[i]);
			rule.minute = Number(res_StartMinutes[i]);

			let ctr = res_Controls[i];
			let bright = res_LedBright[i];
			let color = res_LedColor[i];

			console.log(res_Days[i].split(', ').map(Number));
			schedules.push(schedule.scheduleJob(String(i), rule, function () { //시간마다
				aedes.publish({
				topic: 'ctn/step',
				payload: ctr.toString()
				});
				console.log(ctr.toString());
				if (bright != '-1') {
					aedes.publish({
					topic: 'ctrled',
					payload: (bright + color)
					});
					console.log((bright + color));
				}
			}));

		}
		console.log(res);
		console.log(schedules);

	});

}

function day_parser(sql_day) {
	var day = ['0', '1', '2', '3', '4', '5', '6'];
	var str = ''
	for (var i = 0; i < sql_day.length; i++) {
		if (sql_day.charAt(i) == '1') {
			str = str + day[i] + ', ';
		}
	}
	str = str.slice(0, -2);

	return str;
}




// 3000번 포트로 서버 열기
http.listen(3000, function () {
	console.log("listening on * 3000");
	console.log(res_checker());
});



