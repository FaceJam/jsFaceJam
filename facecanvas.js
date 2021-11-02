/**
 * Code copyright Christopher J. Tralie, 2021
 * Attribution-NonCommercial-ShareAlike 4.0 International
 */


/**
 * Canvas for OpenGL Face Rendering
 */

const READY_STR = "Ready! Press Play!  Change expressions/movement in the faces menu above"
const VIDEO_IMG_EXT = "jpeg";

// https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
window.mobileCheck = function() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
  };

// https://semisignal.com/tag/ffmpeg-js/
function base64ToBinary(base64) {
    let raw = window.atob(base64);
    let rawLength = raw.length;
    let array = new Uint8Array(new ArrayBuffer(rawLength));
    for (i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}
function convertDataURIToBinary(dataURI) {
    let base64 = dataURI.replace(/^data[^,]+,/,'');
    return base64ToBinary(base64);
};

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }


/**
 * Concatenate a list of face points together into one list and add 
 * the points at the extremities of the image
 * @param {3d array} faces An array of faces, each of which has a list of points, 
 *                         each of which is a list [x, y]
 * @param {int} width Width of image containing faces
 * @param {int} height Height of image containing faces
 */
function unwrapFacePoints(faces, width, height) {
    let points = [];
    for (let f = 0; f < faces.length; f++) {
        for (let i = 0; i < faces[f].length; i++) {
            points.push(faces[f][i]);
        }
    }
    points.push([0,0]);
    points.push([width,0]);
    points.push([width,height]);
    points.push([0,height]);
    return points;
}

/**
 * Given a list of pixel locations on an image, transform them into texture coordinates
 * @param {2d array} points An array of points, each of which is a list [x, y].
 * It is assumed that the second to last point has coordinates [width, width]
 *  
 */
function getTextureCoordinates(points) {
    let texPoints = [];
    let res = points[points.length-2][0];
    for (i = 0; i < points.length; i++) {
        texPoints[i*2] = points[i][0]/res;
        texPoints[(i*2)+1] = points[i][1]/res;
    }
    return texPoints;
}

/**
 * Given a list of pixel locations on an image, transform them into
 * vertex coordinates to be displayed on the viewing square [-1, 1] x [-1, 1]
 * @param {2d array} points An array of points, each of which is a list [x, y]
 * It is assumed that the second to last point has coordinates [width, width]
 */
function getVertexCoordinates(points) {
    let vertPoints = [];
    let res = points[points.length-2][0];
    for (i = 0; i < points.length; i++) {
        vertPoints[i*2] = 2*points[i][0]/res - 1;
        vertPoints[(i*2)+1] = 1 - (2*points[i][1]/res);
    }
    return vertPoints;
}

class FaceCanvas {
    /**
     * 
     * @param {int} hop Hop length for audio features (default 512)
     * @param {int} win Window length for audio features (default 2048)
     */
    constructor(hop, win) {
        const that = this;
        let canvas = document.getElementById('FaceCanvas');
        
        canvas.addEventListener("contextmenu", function(e){ e.stopPropagation(); e.preventDefault(); return false; }); 
        this.canvas = canvas;
        this.shader = null;
        this.texture = null; // Regular texture
        this.wtexture = null; // Watermarked texture
        this.faces = []; // List of face points
        this.facesOptions = []; // List of face option objects (energy, smoothness, expression)
        this.imgwidth = 0;
        this.imgheight = 0;

        this.audio = null; // SampledAudio object
        this.audioPlayer = document.getElementById("audioPlayer");
        this.audioReady = false;
        if (hop === undefined) {
            hop = 512;
        }
        if (win === undefined) {
            win = 2048;
        }
        this.hop = hop;
        this.win = win;
        this.novfn = [];
        this.beatRamp = [];
        this.activation = [];
        this.liveAudio = false;
        this.phase = 0;
        this.setupAudioHandlers();
        this.initializeMenus();

        this.time = 0.0;
        this.facesReady = false;
        this.thisTime = (new Date()).getTime();
        this.lastTime = this.thisTime;
        this.time = 0;
        this.animating = false;

        // Variables for capturing to a video
        this.capturing = false;
        this.capFrame = 0;
        this.frames = [];

        this.active = false;
        // Initialize WebGL
        try {
            this.gl = canvas.getContext("webgl");
            this.setupShader();
        } catch (e) {
            console.log(e);
        }
        window.onresize = this.onresize.bind(this);
        this.onresize();
    }

    onresize() {
        this.res = Math.floor(0.8*Math.min(window.innerWidth, window.innerHeight));
        $('.toggle-audio').css('width', this.res+'px');
        $('.toggle-image').css('width', this.res+'px');
        if (window.mobileCheck() && window.innerWidth > 500) {
            let w1 = Math.round(window.innerWidth/100);
            let w2 = Math.round(window.innerWidth/60);
            let w3 = Math.round(window.innerWidth/40);
            this.gui.width = window.innerWidth/2;
            $('.title').css('font-size', (w2+4)+'px');
            $('.property-name').css('font-size', w2+'px');
            $("input[type='text']").css('font-size', w2+'px');
            $('button').css('font-size', w3+'px');
            $('.slider').css('height', '4em');
            $('.close-button').css('font-size', w2);
            $('select').css('font-size', w1+'px');
            $('option').css('font-size', w1+'px');
            const faceMenu = document.getElementsByClassName('close-button close-bottom')[0]
            faceMenu.style['font-size'] = w3+'px';
            faceMenu.style['height'] = '1.5em';
            const faceMenuTxt = document.getElementsByClassName("menuOpenerText")
        }
        const canvas = this.canvas;
        canvas.width = this.res;
        canvas.height = this.res;
        document.getElementById("audioTable").style.width = this.res + "px";
        document.getElementById("imageTable").style.width = this.res + "px";
        document.getElementById("pageStatusWrapper").style.width = this.res + "px";
        this.audioPlayer.style.width = this.res + "px";
        this.gl.viewport(0, 0, this.res, this.res);
        requestAnimationFrame(this.repaint.bind(this));
    }

    setupAudioHandlers() {
        const that = this;
        function printMissing() {
            if (!that.facesReady) {
                progressBar.setLoadingFailed("Be sure to load a face to see the animation!");
            }
            else if(!that.audioReady) {
                progressBar.setLoadingFailed("Be sure to load a tune!");
            }
        }
        this.audioPlayer.addEventListener("play", function() {
            if (that.facesReady && that.audioReady) {
                that.animating = true;
                requestAnimationFrame(that.repaint.bind(that));
            }
            else {
                printMissing();
            }
        });
        this.audioPlayer.addEventListener("pause", function() {
            that.animating = false;
            if (that.facesReady && that.audioReady) {
                requestAnimationFrame(that.repaint.bind(that));
            }
            else {
                printMissing();
            }
        });
        this.audioPlayer.addEventListener("seek", function() {
            if (that.facesReady && that.audioReady) {
                requestAnimationFrame(that.repaint.bind(that));
            }
            else {
                printMissing();
            }
        });
    }

    initializeMenus() {
        const that = this;
        this.gui = new dat.GUI();
        const gui = this.gui;
        this.facesMenu = gui.addFolder("Faces");
        this.facesSubMenus = [];
        this.downloadOptions = {
            "resolution":256, "fps":15
        }
        this.downloadMenu = gui.addFolder("Download And Share");
        // Enforce that the resolution is a power of 2
        this.downloadMenu.add(this.downloadOptions, "resolution", 64, 512).onChange(
            function(v) {
                let val = Math.round(Math.log(v)/Math.log(2));
                val = Math.pow(2, val);
                that.downloadOptions.resolution = val;
            }
        );
        this.downloadMenu.add(this.downloadOptions, "fps", 2, 30).step(1);
        this.downloadMenu.add(this, "saveVideo");
        this.gui.close();
    }

    updateFaceMenus() {
        // Remove menus that were there before
        for (let i = 0; i < this.facesSubMenus.length; i++) {
            this.facesMenu.removeFolder(this.facesSubMenus[i]);
        }
        this.gui.open();
        this.facesMenu.open();
        this.facesSubMenus = [];
        // Create a new menu for each face
        for (let i = 0; i < this.faces.length; i++) {
            let opts = {};
            if (i >= this.facesOptions.length) {
                opts = {"EyebrowEnergy":50, "FaceEnergy":80, "BeatSmoothness":100, "Expression":"smile"};
                this.facesOptions.push(opts);
            }
            else {
                // Reuse options from last time, which is good if we're
                // cycling through different images with a single face
                opts = this.facesOptions[i]; 
            }
            let menu = this.facesMenu.addFolder("Face " + (i+1));
            this.facesSubMenus.push(menu);
            menu.add(opts, "EyebrowEnergy", 0, 100).step(1);
            menu.add(opts, "FaceEnergy", 0, 100).step(1);
            menu.add(opts, "Expression", EXPRESSION_TYPES);
            menu.open();
        }
        this.onresize();
    }

    setActive() {
        this.active = true;
        requestAnimationFrame(this.repaint.bind(this));
    }

    setInactive() {
        this.active = false;
    }

    /**
     * This function sets up and compiles the shader, and it allocates
     * memory for the vertex buffer, index buffer, and triangles buffer
     * 
     * @param {2d array} points An array of points, each of which is a list [x, y]
     */
    setupShader() {
        const gl = this.gl;
        let that = this;

        this.shader = new Promise((resolve, reject) => {
            getShaderProgramAsync(gl, "texture").then((shader) => {
                shader.positionLocation = gl.getAttribLocation(shader, "a_position");
                shader.textureLocation = gl.getAttribLocation(shader, "a_texture");
                gl.enableVertexAttribArray(shader.positionLocation);
                gl.enableVertexAttribArray(shader.textureLocation);
                shader.uSampler = gl.getUniformLocation(shader, 'uSampler');
                shader.uTimeUniform = gl.getUniformLocation(shader, "uTime");

                // Setup positions for the vertex buffer
                const positionBuffer = gl.createBuffer();
                shader.positionBuffer = positionBuffer;
                gl.bindBuffer(gl.ARRAY_BUFFER, shader.positionBuffer);
                gl.vertexAttribPointer(shader.positionLocation, 2, gl.FLOAT, false, 0, 0);

                // Setup positions for the texture coordinate buffer
                const textureCoordBuffer = gl.createBuffer();
                shader.textureCoordBuffer = textureCoordBuffer;
                gl.bindBuffer(gl.ARRAY_BUFFER, shader.textureCoordBuffer);
                gl.vertexAttribPointer(shader.textureLocation, 2, gl.FLOAT, false, 0, 0);

                // Setup triangles
                const indexBuffer = gl.createBuffer();
                shader.indexBuffer = indexBuffer;
                that.shader = shader;

                shader.shaderReady = true;
                resolve(shader);
            });
        });
    }

    /**
     * Compute all of the audio features used to animate the face
     */
    computeAudioFeatures() {
        const that = this;
        new Promise((resolve, reject) => {
            const worker = new Worker("audioworker.js");
            let payload = {samples:that.audio.samples, sr:that.audio.sr, win:that.win, hop:that.hop};
            worker.postMessage(payload);
            worker.onmessage = function(event) {
                if (event.data.type == "newTask") {
                    progressBar.loadString = event.data.taskString;
                }
                else if (event.data.type == "error") {
                    that.progressBar.setLoadingFailed(event.data.taskString);
                    reject();
                }
                else if (event.data.type == "debug") {
                    console.log("Debug: " + event.data.taskString);
                }
                else if (event.data.type == "end") {
                    that.novfn = event.data.novfn;
                    that.beatRamp = event.data.beatRamp;
                    that.activation = event.data.activation;
                    resolve();
                }
            }
        }).then(() => {
            if (this.facesReady) {
                progressBar.changeToReady();
                progressBar.changeMessage(READY_STR);
            }
            else {
                progressBar.changeToReady();
                progressBar.changeMessage("Finished audio, waiting for face");
            }
            that.audioReady = true;
        }).catch(reason => {
            progressBar.setLoadingFailed(reason);
        });
        progressBar.startLoading();
    }

    /**
     * Connect audio to this face canvas and compute the features
     * @param {SampledAudio} audio A SampledAudio object with loaded audio samples
     */
    connectAudio(audio) {
        this.liveAudio = false;
        this.audio = audio;
        audio.connectAudioPlayer(this.audioPlayer);
        this.computeAudioFeatures();
    }

    /**
     * Start a live audio recording
     * @param {SampledAudio} audio Handle to object where audio will be stored
     */
    liveRecord(audio) {
        const that = this;
        this.audio = audio;
        progressBar.startLoading();
        let fac = 4;
        this.beat = new OnlineBeat(audio, this.hop, fac);
        this.liveAudio = true;
        this.beat.startRecording("startLiveRecording", "stopLiveRecording", this.win, 3, 1, function(phase) {
            requestAnimationFrame(that.repaint.bind(that));
        });
        progressBar.loadString = "Recording live audio (NOTE: Not yet optimized for mobile)";
    }

    updateTexture(texture) {
        this.texture = texture;
    }

    updateWTexture(wtexture) {
        this.wtexture = wtexture;
    }

    /**
     * Update the vertex buffer with a new set of points, but do not
     * update the texture coordinate buffer.  This can be used to move
     * the face around
     * 
     * @param {3d array} faces An array of faces, each of which has a list of points, 
     *                         each of which is a list [x, y]
     */
    updateVertexBuffer(faces) {
        let that = this;
        if (!('shaderReady' in this.shader)) {
            this.shader.then(that.updateVertexBuffer(faces).bind(that));
        }
        else {
            const gl = this.gl;
            const points = unwrapFacePoints(faces, this.imgwidth, this.imgheight);
            let vertPoints = getVertexCoordinates(points);
            vertPoints = new Float32Array(vertPoints);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.shader.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertPoints, gl.STATIC_DRAW);
        }
    }

    /**
     * Create a triangulation between all of the points and copy it
     * over to the GPU as an index buffer.  This method assumes that 
     * the bounding boxes of the faces are disjoint and that they are all
     * contained within the full image box
     * 
     * @param {2d array} points An array of points, each of which is a list [x, y]
     * It is assumed that the last 4 coordinates are the bounding rectangle of
     * the full image
     */
    updateIndexBuffer(points) {
        if (!('shaderReady' in this.shader)) {
            this.shader.then(this.updateIndexBuffer(points).bind(this));
        }
        else {
            const gl = this.gl;
            const indexBuffer = this.shader.indexBuffer;

            // Step 1: Use a Delaunay triangulation to get the triangles
            // that connect bounding boxes of all of the faces to each
            // other and to the last 4 image bounding box coordinates
            let numFaces = (points.length-4)/(N_LANDMARKS+4);
            let X = [];
            // Add bounding box points
            let offset = N_LANDMARKS;
            for (let f = 0; f < numFaces; f++) {
                for (let k = 0; k < 4; k++) {
                    X.push([points[offset+k][0], points[offset+k][1]]);
                }
                offset += N_LANDMARKS+4;
            }
            offset = points.length-4;
            // Add the last 4 points for the bounding box for the full image
            for (let k = 0; k < 4; k++) {
                X.push([points[offset+k][0], points[offset+k][1]]);
            }
            let edges = [];
            // Add the edges of the bounding boxes as constraints
            for (let f = 0; f <= numFaces; f++) {
                for (let k = 0; k < 4; k++) {
                    edges.push([f*4+k, f*4+(k+1)%4]);
                }
            }
            let ctris = cdt2d(X, edges, {"interior":true}); // Connecting triangles
            let tris = [];
            // Remove triangles that intersect with a bounding box
            for (let t = 0; t < ctris.length; t++) {
                // At least two of the points on the triangle
                // must reside on a different box
                let allSame = Math.floor(ctris[t][0]/4) == Math.floor(ctris[t][1]/4);
                allSame = allSame && (Math.floor(ctris[t][1]/4) == Math.floor(ctris[t][2]/4));
                if (!allSame) {
                    // Convert indices to offset in points list and
                    // add them to the overall triangulation
                    for (let k = 0; k < 3; k++) {
                        let v = ctris[t][k]%4;  // Which vertex this is on the box
                        let f = (ctris[t][k]-v)/4; // Which box it's in
                        let vidx = f*(N_LANDMARKS+4) + v;
                        if (f < numFaces) {
                            vidx += N_LANDMARKS;
                        }
                        tris.push(vidx);
                    }
                }
            }
            
            // Step 2: Add triangles for every face
            offset = 0;
            for (let f = 0; f < numFaces; f++) {
                for (let t = 0; t < FACE_TRIS.length/3; t++) {
                    for (let k = 0; k < 3; k++) {
                        tris.push(FACE_TRIS[t*3+k] + offset);
                    }
                }
                offset += N_LANDMARKS + 4;
            }

            // Unravel points
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tris), gl.STATIC_DRAW);
            indexBuffer.itemSize = 1;
            indexBuffer.numItems = tris.length;
        }
    }

    /**
     * Update the points for the face for both the vertex buffer
     * and texture coordinate buffer, including points at the boundaries of the image
     * 
     * @param {3d array} faces An array of faces, each of which has a list of points, 
     *                         each of which is a list [x, y]
     * @param {int} width Width of image containing faces
     * @param {int} height Height of image containing faces
     */
     setFacePoints(faces, width, height) {
        if (faces.length > 0) {
            let that = this;
            if (!('shaderReady' in this.shader)) {
                this.shader.then(that.setFacePoints(faces, width, height).bind(that));
            }
            else {
                this.faces = faces;
                this.imgwidth = width;
                this.imgheight = height;
                const gl = this.gl;
                const points = unwrapFacePoints(faces, this.imgwidth, this.imgheight);
                this.updateVertexBuffer(faces);
                let textureCoords = new Float32Array(getTextureCoordinates(points));
                gl.bindBuffer(gl.ARRAY_BUFFER, this.shader.textureCoordBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.STATIC_DRAW);
                this.updateIndexBuffer(points);
                if (this.active) {
                    requestAnimationFrame(this.repaint.bind(this));
                }
                this.updateFaceMenus();
                this.facesReady = true;
                if (this.audioReady) {
                    progressBar.changeToReady();
                    progressBar.changeMessage(READY_STR);
                }
                else if (progressBar.loading) {
                    progressBar.changeToReady();
                    progressBar.changeMessage("Finished face, waiting for audio");
                }
            }
        }
        else {
            console.log("Warning: Undefined points");
        }
    }

    /**
     * Begin the process of capturing the video frame by frame
     */
    saveVideo() {
        if (!this.facesReady) {
            progressBar.setLoadingFailed("Need to select face image first!");
        }
        else if (!this.audioReady) {
            progressBar.setLoadingFailed("Need to select tune first!");
        }
        else {
            if (!progressBar.loading) {
                progressBar.startLoading("Saving video");
            }
            this.capturing = true;
            this.capFrame = 0;
            this.frames = [];
            requestAnimationFrame(this.repaint.bind(this));
        }
    }


    /**
     * Capture and watermark the current state of the gl canvas and add
     * it to the list fo frames
     */
    captureVideoFrame() {
        const data = convertDataURIToBinary(this.canvas.toDataURL("image/"+VIDEO_IMG_EXT, 1));
        const name = `img${ pad( this.frames.length, 3 ) }.` + VIDEO_IMG_EXT;
        this.frames.push({
            name: name,
            data: data
        });
        this.capFrame += 1;
        requestAnimationFrame(this.repaint.bind(this));
    }

    /**
     * Stitch all of the images together into an mp4 video with an ffmpeg
     * worker, add audio, and save as a download
     * With help from
     * https://gist.github.com/ilblog/5fa2914e0ad666bbb85745dbf4b3f106
     */
    finishVideoCapture() {      
        let that = this;
        const worker = new Worker('libs/ffmpeg-worker-mp4.js');
        worker.onmessage = function(e) {
            var msg = e.data;
            if (msg.type == "stderr") {
                progressBar.changeMessage(msg.data);
            }
            else if (msg.type == "exit") {
                progressBar.setLoadingFailed("Process exited with code " + msg.data);
            }
            else if (msg.type == "done") {
                console.log(msg);
                const blob = new Blob([msg.data.MEMFS[0].data], {
                    type: "video/mp4"
                });
                const a = document.createElement('a');
                a.href = window.URL.createObjectURL(blob);
                a.innerHTML = "Click here to download generated video";
                a.download = 'facejam.mp4';
                progressBar.changeToReady("Successfully generated video");
                const downloadArea = document.getElementById("downloadLink");
                downloadArea.innerHTML = "";
                downloadArea.appendChild(a);
                a.click();
            }
        };
        // Setup audio blob
        // Scale down audio to avoid clipping
        for (let i = 0; i < this.audio.samples.length; i++) {
            this.audio.samples[i] *= 0.8;
        }
        let mp3bytes = getMP3Binary(this.audio.samples, this.audio.sr);
        that.frames.push({name: "audio.mp3", data: mp3bytes});
        // Call ffmpeg
        let videoRes = that.downloadOptions.resolution;
        let fps = that.downloadOptions.fps;
        worker.postMessage({
            type: 'run',
            TOTAL_MEMORY: 256*1024*1024,
            arguments: ["-i", "audio.mp3", "-r", ""+fps, "-i", "img%03d.jpeg", "-c:v", "libx264", "-crf", "1", "-vf", "scale="+videoRes+":"+videoRes, "-pix_fmt", "yuv420p", "-vb", "20M", "facejam.mp4"],
            MEMFS: that.frames
        });        
    }

    repaint() {
        let that = this;
        let shader = this.shader;
        if (!("shaderReady" in shader)) {
            // Wait for shader promise
            shader.then(requestAnimationFrame(that.repaint.bind(that)));
            return;
        }
        if (this.texture == null) {
            return;
        }
        // Step 1: Set the time
        this.thisTime = (new Date()).getTime();
        this.time += (this.thisTime - this.lastTime)/1000.0;
        this.lastTime = this.thisTime;
        let time = this.audioPlayer.currentTime;
        if (this.capturing) {
            let videoFps = this.downloadOptions.fps;
            time = this.capFrame/videoFps;
        }

        // Step 2: Update the facial landmark positions according to the audio
        if (this.active && this.faces.length > 0) {
            // Store first frame of the expression, then do point location
            // and map through Barycentric coordinates to the new neutral face
            let idx = 0;
            if (this.audioReady && this.facesReady) {
                idx = Math.floor(time*this.audio.sr/this.hop);
            }
            let faces = [];
            for (let f = 0; f < this.faces.length; f++) {
                let eyebrow = 0;
                let activation = 0;
                if (this.liveAudio) {
                    eyebrow = 0.25*this.beat.phase*this.facesOptions[f].EyebrowEnergy;
                    activation = this.beat.energy*this.facesOptions[f].FaceEnergy/100;
                }
                else {
                    if (idx < this.novfn.length) {
                        eyebrow = 0.25*this.beatRamp[idx]*this.facesOptions[f].EyebrowEnergy;
                    }
                    if (idx < this.activation.length) {
                        activation = this.activation[idx]*this.facesOptions[f].FaceEnergy/100;
                    }
                }
                faces[f] = transferFacialExpression(this.facesOptions[f].Expression, this.faces[f], activation, eyebrow);
            }
            this.updateVertexBuffer(faces);
        }

        // Step 3: Finally, draw the frame
        const gl = this.gl;
        gl.useProgram(shader);
        gl.uniform1f(shader.uTimeUniform, this.time);

        // Set active texture
        gl.activeTexture(gl.TEXTURE0);
        if (this.capturing) {
            gl.bindTexture(gl.TEXTURE_2D, this.wtexture);
        }
        else {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
        }
        gl.uniform1i(shader.uSampler, 0);

        // Bind vertex, texture and index buffers to draw two triangles
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shader.indexBuffer);
        gl.drawElements(gl.TRIANGLES, shader.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        if (this.capturing) {
            let duration = this.audioPlayer.duration;
            if (time < duration) {
                let perc = Math.round(100*time/duration);
                progressBar.changeMessage(perc + "% completed capturing frames");
                this.captureVideoFrame();
            }
            else {
                this.capturing = false;
                progressBar.changeMessage("Assembling video");
                this.finishVideoCapture();
            }
        }
        else if (this.animating) {
            requestAnimationFrame(this.repaint.bind(this));
        }
    }
}