/**
 * Code copyright Christopher J. Tralie, 2021
 * Attribution-NonCommercial-ShareAlike 4.0 International
 */

/** The file that puts everything together for running */
(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
  })();

let progressBar = new ProgressBar();
let faceCanvas = new FaceCanvas();
faceCanvas.setActive();
let audio = new SampledAudio();

/********************************************************
 *                 PICTURE MENUS                        *
 ********************************************************/
let examplePictureMenu = document.getElementById("ExamplePictures");
examplePictureMenu.addEventListener('change', function(e){
    let image = new Image();
    image.src = e.target.value;
    image.onload = function() {
        imageLoaded(image);
    }
    progressBar.startLoading();
});

let imageInput = document.getElementById('imageInput');
imageInput.addEventListener('change', function(e) {
    let reader = new FileReader();
    reader.onload = function(e) {
        let arrayBufferView = new Uint8Array(e.target.result);
        let blob = new Blob([arrayBufferView], {type: imageInput.files[0].type});
        let urlCreator = window.URL || window.webkitURL;
        let imageUrl = urlCreator.createObjectURL(blob);
        let image = new Image();
        image.src = imageUrl;
        console.log(e.target.result);
        image.onload = function() {
            imageLoaded(image);
        }
    }
    reader.readAsArrayBuffer(imageInput.files[0]);
    progressBar.startLoading();
});


/********************************************************
 *                    TUNE MENUS                        *
 ********************************************************/

let exampleTuneMenu = document.getElementById("ExampleTunes");
exampleTuneMenu.addEventListener('change', function(e){
    audio.loadFile(e.target.value).then(function(){
        progressBar.changeToReady("Finished loading audio");
        faceCanvas.connectAudio(audio);
    });
    progressBar.loadString = "Loading audio";
    progressBar.startLoading();
});
APPLE_LOGO_URL = "Apple_Music_logo.svg";
let appleMusic = new AppleMusic("appleMusicDiv", audio, function() {
    progressBar.changeToReady("Finished loading audio");
    faceCanvas.connectAudio(audio);
},
function() {
    progressBar.setLoadingFailed("Failed to load audio from Apple Music 😿");
});

let tuneInput = document.getElementById('tuneInput');
tuneInput.addEventListener('change', function(e) {
    let reader = new FileReader();
    reader.onload = function(e) {
        audio.setSamplesAudioBuffer(e.target.result).then(function(){
            progressBar.changeToReady("Finished loading audio");
            faceCanvas.connectAudio(audio);
        });
    }
    reader.readAsArrayBuffer(tuneInput.files[0]);
    progressBar.loadString = "Loading audio";
    progressBar.startLoading();
});

function startRecording() {
    progressBar.startLoading();
    audio.startRecording("startRecording", "stopRecording");
    progressBar.loadString = "Recording audio";
}
function stopRecording() {
    audio.stopRecording().then(function(){
        progressBar.changeToReady("Finished loading audio");
        faceCanvas.connectAudio(audio);
    });
}
document.getElementById("stopRecording").style.display = "none";


function startLiveRecording() {
    faceCanvas.liveRecord(audio);
}
function stopLiveRecording() {
    audio.stopRecordingRealtime();
    faceCanvas.connectAudio(audio); // Pass audio along for playback
}
document.getElementById("stopLiveRecording").style.display = "none";


$('.imageTable').hide();
$('.toggle-image').on('click',function() {					
  $(this).text(function(_,currentText){
    return currentText == "▼ Choose Face(s) Image 🧔👵🏿" ? "▲ Choose Face(s) Image 🧔👵🏿" : "▼ Choose Face(s) Image 🧔👵🏿";
  });
  $('.imageTable').toggle('slow');
});

$('.audioTable').hide();
$('.toggle-audio').on('click',function() {					
  $(this).text(function(_,currentText){
    return currentText == "▼ Choose Tune 🎵" ? "▲ Choose Tune 🎵" : "▼ Choose Tune 🎵";
  });
  $('.audioTable').toggle('slow');
});
