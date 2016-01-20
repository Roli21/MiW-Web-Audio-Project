var inputFile = null;
var file = null;
var fileName = "";
var playButton = null;
var micButton = null;
var audioContext = null;
var audioBufferSourceNode = null;
var audioPlaying = false;
var canvas = null;
var ctxHeartbeat = null;
var ctxHeart = null;
var ctxTime = null;
var elapsedTime = 0;
var initTime = 0;
var durationTime = 0;
var analyser = null;
var drawStreamArray = null;
var xc = 0;
var yc = 0;
var i = 0;
var aniFrameId = null;
var prevTimeStamp = 0;
var audioGainNode = null;
var microphone = false;

window.onload = function()
{
	console.log('window onload');
	window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
	window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
	window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
	
	try
	{
		audioContext = new (window.AudioContext || window.webkitAudioContext)();
	}
	catch(error)
	{
		console.error(error);
	}
	
	inputFile = document.getElementById("picker-input");
	inputFile.onchange = funcInputChange;
	
	playButton = document.getElementById("picker-button");
	playButton.onclick = funcButtonClick;

	micButton =  document.getElementById("mic-picker-button");
	micButton.onclick = funcMicButtonClick;

	micButton =  document.getElementById("stop-process");
	micButton.onclick = cbStopProcess;
	
	canvas = document.getElementById("heartbeat");
	ctxHeartbeat = canvas.getContext("2d");

	canvas = document.getElementById("heart");
	ctxHeart = canvas.getContext("2d");

	canvas = document.getElementById("time");
	ctxTime = canvas.getContext("2d");

	analyser = audioContext.createAnalyser();
	audioGainNode = audioContext.createGain();
	
	analyser.connect(audioGainNode);
	audioGainNode.connect(audioContext.destination);
};

function funcInputChange()
{
	console.log('call funcInputChange');
	if(inputFile.files.length != 0)
	{
		file = inputFile.files[0];
		fileName = file.name;
	}
}


function funcButtonClick()
{
	console.log('call funcButtonClick');

	if(file.type.split("/")[0] == "audio") {
		var fileReader = new FileReader();
		fileReader.onload = function(e)
		{
			var fileResult = e.target.result;
			if(audioContext == null)
			{
				return;
			}
			audioContext.decodeAudioData(fileResult, function(buffer) {
				console.log(buffer);
				visualize(buffer);
				clearDraw();
			}, function(error) {
				console.error(error);
			});
		};
		fileReader.onerror = function(error)
		{
			console.error(error);
		};

		fileReader.readAsArrayBuffer(file);
	}
}

function funcMicButtonClick()
{
	console.log('call funcMicButtonClick');

	navigator.getUserMedia = (navigator.getUserMedia ||
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia ||
	navigator.msGetUserMedia);

	var distortion = audioContext.createWaveShaper();
	var gainNode = audioContext.createGain();
	var biquadFilter = audioContext.createBiquadFilter();
	var convolver = audioContext.createConvolver();

	if (navigator.getUserMedia) {
		console.log('getUserMedia supported.');
		navigator.getUserMedia (
			{
				audio: true
			},
			function(stream) {

				var frameCount = audioContext.sampleRate * 2.0;
				var myArrayBuffer = audioContext.createBuffer(2, frameCount, audioContext.sampleRate);
				console.log('BUFFER:');
				console.log(myArrayBuffer);

				source = audioContext.createMediaStreamSource(stream);
				source.connect(analyser);
				analyser.connect(distortion);
				distortion.connect(biquadFilter);
				biquadFilter.connect(convolver);
				convolver.connect(gainNode);
				gainNode.connect(audioContext.destination);
				visualize(myArrayBuffer, 'microphone');
			},
			function(err) {
				console.log('StreamError: ' + err);
			}
		);
	}
}

function cbStopProcess(){
	console.log('stop process');
	audioBufferSourceNode.stop();
	audioBufferSourceNode.disconnect();
	cancelAnimationFrame(aniFrameId);
	aniFrameId = null;
	audioPlaying = false;
	clearDraw();
}

function visualize(buffer, source)
{
	console.log('call visualize');

	audioBufferSourceNode = audioContext.createBufferSource();
	
	audioBufferSourceNode.buffer = buffer;
	analyser.smoothingTimeConstant = 0.85;
	audioGainNode.gain.value = 1;
	
	audioBufferSourceNode.connect(analyser);
	
	audioBufferSourceNode.start();
	
	audioPlaying = true;
	initTime = audioContext.currentTime;
	durationTime = buffer.duration;

	draw(0, 'microphone');

	if(source !== "microphone") {
		audioBufferSourceNode.onended = function()
		{
			audioBufferSourceNode.stop();
			audioBufferSourceNode.disconnect();

			if(aniFrameId !== null)
			{
				cancelAnimationFrame(aniFrameId);
				aniFrameId = null;
			}

			audioPlaying = false;
			clearDraw();
		};
	}
}

function generateTime(sec)
{
	var min = Math.floor(sec / 60);
	var sec = Math.floor(sec % 60);
	
	return ((min < 10)?("0" + min):(min)) + ":" + ((sec < 10)?("0" + sec):(sec));
}

function clearDraw()
{
	console.log('call clearDraw');

	ctxHeartbeat.clearRect(0, 0, 400, 400);
	ctxTime.clearRect(0, 0, 200, 200);

	ctxTime.fillStyle = "#222222";
	ctxTime.font = "100 40px Indie Flower";
	ctxTime.textAlign = "center";
	ctxTime.textBaseline = "middle";
	ctxTime.fillText("00:00", 150, 50);

	microphone = false;
}

function draw(currentTimeStamp, source)
{
	console.log('call draw');

	if(source == "microphone") {
		console.log('microphone = true');
		microphone = true;
	}

	elapsedTime = audioContext.currentTime - initTime;
	drawStreamArray = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(drawStreamArray);

	// Canvas Heartbeat
	ctxHeartbeat.clearRect(0, 0, 400, 400);
	ctxTime.clearRect(0, 0, 200, 200);
	ctxHeartbeat.lineWidth = 1.0;
	ctxHeartbeat.fillStyle = "#FFFFFF";
	ctxHeartbeat.strokeStyle = "#DDDDDD";
	ctxHeartbeat.beginPath();
	ctxHeartbeat.moveTo(150 + Math.cos(0.5 * Math.PI) * (25 + (drawStreamArray[0] / 150 * 80)), 150 + Math.sin(0.5 * Math.PI) * (25 + (drawStreamArray[0] / 150 * 80)));

	for(i = 1; i < (drawStreamArray.length / 4); i++)
	{
		xc = ((150 + Math.cos((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))) + (150 + Math.cos((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i + 1] / 150 * 80)))) / 2;
		yc = ((150 + Math.sin((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))) + (150 + Math.sin((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i + 1] / 150 * 80)))) / 2;
		ctxHeartbeat.quadraticCurveTo((150 + Math.cos((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))),
			(150 + Math.sin((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))), xc, yc);
		ctxHeartbeat.fillStyle = 'rgb(' + (drawStreamArray[i] + 150) + ',' + (drawStreamArray[i] + 0) + ',' + (drawStreamArray[i] + 0) + ')';
	}

	ctxHeartbeat.quadraticCurveTo((150 + Math.cos((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))),
		(150 + Math.sin((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))),
		(150 + Math.cos((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i + 1] / 150 * 80))),
		(150 + Math.sin((0.5 - (i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i + 1] / 150 * 80))));

	ctxHeartbeat.moveTo(150 + Math.cos(0.5 * Math.PI) * (25 + (drawStreamArray[0] / 150 * 80)), 150 + Math.sin(0.5 * Math.PI) * (25 + (drawStreamArray[0] / 150 * 80)));

	for(i = 1; i < (drawStreamArray.length / 4); i++)
	{
		xc = ((150 + Math.cos((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))) + (150 + Math.cos((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i + 1] / 150 * 80)))) / 2;
		yc = ((150 + Math.sin((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))) + (150 + Math.sin((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i + 1] / 150 * 80)))) / 2;
		ctxHeartbeat.quadraticCurveTo((150 + Math.cos((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))),
			(150 + Math.sin((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))), xc, yc);
	}

	ctxHeartbeat.quadraticCurveTo((150 + Math.cos((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))),
		(150 + Math.sin((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i] / 150 * 80))),
		(150 + Math.cos((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i + 1] / 150 * 80))),
		(150 + Math.sin((0.5 - (4 - i / drawStreamArray.length * 4)) * Math.PI) * (25 + (drawStreamArray[i + 1] / 150 * 80))));

	ctxHeartbeat.fill();
	ctxHeartbeat.stroke();

	// Canvas Heart
	for(i = 1; i < (drawStreamArray.length / 4); i++)
	{
		ctxHeart.fillStyle = 'rgb(' + (drawStreamArray[i] + 180) + ',' + (drawStreamArray[i] + 10) + ',' + (drawStreamArray[i] + 10) + ')';
	}
	ctxHeart.beginPath();
	ctxHeart.moveTo(75,40);
	ctxHeart.bezierCurveTo(75,37,70,25,50,25);
	ctxHeart.bezierCurveTo(20,25,20,62.5,20,62.5);
	ctxHeart.bezierCurveTo(20,80,40,102,75,120);
	ctxHeart.bezierCurveTo(110,102,130,80,130,62.5);
	ctxHeart.bezierCurveTo(130,62.5,130,25,100,25);
	ctxHeart.bezierCurveTo(85,25,75,37,75,40);
	ctxHeart.fill();



	ctxTime.fillStyle = "#222222";
	ctxTime.font = "300 40px Indie Flower";
	ctxTime.textAlign = "center";
	ctxTime.textBaseline = "middle";
	ctxTime.fillText(generateTime(elapsedTime), 150, 50);

	if(!microphone) {
		ctxTime.fillStyle = "#888888";
		ctxTime.font = "300 30px Indie Flower";
		ctxTime.textAlign = "center";
		ctxTime.textBaseline = "middle";
		ctxTime.fillText("-" + generateTime(durationTime - elapsedTime), 150, 100);
	}

	if(audioPlaying) {
		aniFrameId = requestAnimationFrame(draw);
	}

	prevTimeStamp = currentTimeStamp;
}