const csrftoken = $("[name=csrfmiddlewaretoken]").val();

let postAjax = function(formData, url){
    $.ajax({
        beforeSend: function (xhr) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
            // xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        },
        url: url,
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        method: 'post',
        type: 'post',
        success: function(){
            location.href = document.referrer;
        },
        error: function (jqXHR, textStatus, errorThrown) {
            alert(jqXHR.responseText);
            console.log(textStatus);
            console.log(errorThrown);
        }
    });
};

const image_canvas = document.getElementById('image_canvas');
const prediction_canvas = document.getElementById('prediction_canvas');
const cursor_canvas = document.getElementById("cursor_canvas");
const poly_canvas = document.getElementById('poly_canvas');

const image_context = image_canvas.getContext('2d');
const prediction_context = prediction_canvas.getContext('2d');
const cursor_context = cursor_canvas.getContext('2d');
const poly_context = poly_canvas.getContext('2d');

trackTransforms(image_context);
trackTransforms(prediction_context);
trackTransforms(poly_context);

const width = 1920;
const height = 1080;

image_canvas.width = width;
image_canvas.height = height;
prediction_canvas.width = width;
prediction_canvas.height = height;
poly_canvas.width = width;
poly_canvas.height = height;

let image = new Image();
let prediction = new Image();

image.onload = function(){
    image_context.image = image;
    image_context.clearRect(0, 0, image_context.width, image_context.height);
    image_context.drawImage(this, 0, 0);
    image_canvas.setAttribute('tabindex','0');
    image_canvas.focus();
};

prediction.onload = function(){
    prediction_context.image = prediction;
    prediction_context.clearRect(0, 0, prediction_canvas.width, prediction_canvas.height);
    prediction_context.drawImage(this, 0, 0);
};

let scaleFactor = 0.006;
let lastX=prediction_canvas.width/2, lastY=prediction_canvas.height/2;
let dragStart, dragged;
let eraserSize = 30;
let eraserScaleFactor = 20;

let polyStart = [];
let polyStarted = false;

let showHide = function(){
    switch(showHideButton.textContent) {
        case 'both':
            prediction_canvas.style.visibility = 'hidden';
            poly_canvas.style.visibility = 'visible';
            showHideButton.textContent = 'image';
            break;
        case 'image':
            image_context.redraw(true);

            prediction_canvas.style.visibility = 'visible';
            poly_canvas.style.visibility = 'visible';
            showHideButton.textContent = 'prediction';
            break;
        case 'prediction':
            image_context.redraw();

            prediction_canvas.style.visibility = 'visible';
            poly_canvas.style.visibility = 'visible';
            showHideButton.textContent = 'both';
            break;
    }
};

let check = function(message, success){
    image_context.zoomBack();
    prediction_context.zoomBack();
    poly_context.zoomBack();
    if(message == 'perfect'){
        prediction_context.clearRect(0, 0, prediction_canvas.width, prediction_canvas.height);
    }
    prediction_canvas.toBlob(function(blob) {
        let formData = new FormData(document.getElementById('uploadForm'));
        formData.set('message', message);
        formData.set('rle_csv', blob, ($('#id_uploaded_date').val() + '_' + $('#id_lot_number').val()+'.png'));
        $.ajax({
            beforeSend: function (xhr) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            },
            url: '',
            data: formData,
            cache: false,
            contentType: false,
            processData: false,
            method: 'post',
            type: 'post',
            success: function(){
                location.href = window.origin + '/capture/add/';
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert(jqXHR.responseText);
                console.log(textStatus);
                console.log(errorThrown);
            }
        });
    });
};

let perfect = function(){
    image_context.zoomBack();
    prediction_context.zoomBack();
    poly_context.zoomBack();
    prediction_context.clearRect(0, 0, prediction_canvas.width, prediction_canvas.height);
    prediction_canvas.toBlob(function(blob) {
        $('#id_message').val('perfect');
        let formData = new FormData(document.getElementById('uploadForm'));
        formData.set('rle_csv', blob, ($('#id_uploaded_date').val() + '_' + $('#id_lot_number').val()+'.png'));
        postAjax(formData, back);
    });
};

let defect = function(){
    image_context.zoomBack();
    prediction_context.zoomBack();
    poly_context.zoomBack();
    prediction_canvas.toBlob(function(blob) {
        $('#id_message').val('defect');
        let formData = new FormData(document.getElementById('uploadForm'));
        formData.set('rle_csv', blob, ($('#id_uploaded_date').val() + '_' + $('#id_lot_number').val()+'.png'));
        postAjax(formData, back);
    });
};

let later = function(){
    image_context.zoomBack();
    prediction_context.zoomBack();
    poly_context.zoomBack();
    prediction_canvas.toBlob(function(blob) {
        $('#id_message').val('later');
        let formData = new FormData(document.getElementById('uploadForm'));
        formData.set('rle_csv', blob, ($('#id_uploaded_date').val() + '_' + $('#id_lot_number').val()+'.png'));
        postAjax(formData, back);
    });
};

function drawEraser(x, y){
    cursor_canvas.width = eraserSize;
    cursor_canvas.height = eraserSize;
    cursor_canvas.style.width = eraserSize + 'px';
    cursor_canvas.style.height = eraserSize + 'px';
    cursor_canvas.style.left = x - eraserSize/2 + 'px';
    cursor_canvas.style.top = y - eraserSize/2 + 'px';

    if(showHideButton.textContent === 'prediction') cursor_context.strokeStyle = 'white';
    else cursor_context.strokeStyle = 'black';

    cursor_context.lineWidth = 3;
    cursor_context.strokeRect(0, 0, eraserSize, eraserSize);
}

let erase = function(event){
    let left = event.clientX - event.offsetX;
    let top = event.clientY - event.offsetY;
    let EraseXS = (cursor_canvas.offsetLeft-left)/prediction_canvas.offsetWidth*prediction_canvas.width;
    let EraseYS = (cursor_canvas.offsetTop-top)/prediction_canvas.offsetHeight*prediction_canvas.height;
    let EraseXE = (cursor_canvas.offsetLeft+cursor_canvas.offsetWidth-left)/prediction_canvas.offsetWidth*prediction_canvas.width;
    let EraseYE = (cursor_canvas.offsetTop+cursor_canvas.offsetHeight-top)/prediction_canvas.offsetHeight*prediction_canvas.height;
    let start = prediction_context.transformedPoint(EraseXS, EraseYS);
    let end = prediction_context.transformedPoint(EraseXE, EraseYE);

    prediction_context.save();
    prediction_context.zoomBack();
    prediction_context.clearRect(start.x, start.y, end.x-start.x, end.y-start.y);
    prediction.src = prediction_canvas.toDataURL();
    prediction_context.restore();
    prediction_context.redraw();
};

image_canvas.addEventListener('contextmenu', function(event){
    return event.preventDefault() && false;
}, false);

image_canvas.addEventListener('mousedown', function(event){
    document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';

    if(event.shiftKey) {
        dragStart = image_context.transformedPointEvent(event);
        dragged = false;
    } else if(event.ctrlKey || polyStarted) {
        if (event.buttons === 1) {
            if ((polyStarted === false) && (polyStart.length !== 0)) {
                polyStart = [];
            }
            polyStart.push(image_context.transformedPointEvent(event));
            polyStarted = true;
        } else if (event.buttons === 2) {
            prediction_context.save();
            prediction_context.zoomBack();
            prediction_context.drawPoly(polyStart);
            prediction.src = prediction_canvas.toDataURL();
            prediction_context.restore();
            prediction_context.redraw();
            polyStarted = false;
            polyStart = [];
            poly_context.clearRect(0, 0, poly_canvas.width, poly_canvas.height);
        }
    } else if(event.altKey) {
        drawEraser(event.clientX, event.clientY);
        erase(event)
    }
    return event.preventDefault() && false;
}, false);

image_canvas.addEventListener('mousemove', function(event) {
    image_canvas.setAttribute('tabindex','0');
    image_canvas.focus();
    lastX = event.clientX;
    lastY = event.clientY;

    if (event.altKey) {
        if (cursor_canvas.style.visibility === 'visible') {
            drawEraser(event.clientX, event.clientY);
            if (event.buttons === 1) erase(event);
        }
    } else if(event.shiftKey) {
        dragged = true;
        if (dragStart) {
            let pt = image_context.transformedPointEvent(event);
            image_context.translate(pt.x - dragStart.x, pt.y - dragStart.y);
            image_context.redraw();
            if (prediction.src !== ""){
                prediction_context.translate(pt.x - dragStart.x, pt.y - dragStart.y);
                prediction_context.redraw();
            }
            poly_context.translate(pt.x - dragStart.x, pt.y - dragStart.y);
            poly_context.redraw();
        }
    } else if (polyStarted) {
        poly_context.drawPoly(polyStart, event);
    } else {
    }
    return event.preventDefault() && false;
}, false);

image_canvas.addEventListener('mouseup',function(event){
    if(event.altKey) {
    }
    dragStart = null;
    return event.preventDefault() && false;
}, false);

image_canvas.addEventListener('mousewheel', function(event) {
    if (event.ctrlKey) {
    } else if (event.shiftKey) {
        image_context.zoomEvent(event);
        prediction_context.zoomEvent(event);
        poly_context.zoomEvent(event);
        if (polyStarted) {
            poly_context.drawPoly(polyStart, event);
        }
    } else if(event.altKey) {
        if( event.wheelDelta > 0 ){
            eraserSize += eraserScaleFactor
        } else if(eraserSize > 20) {
            eraserSize -= eraserScaleFactor
        }
        drawEraser(event.clientX, event.clientY);
    }
    return event.preventDefault() && false;
}, false);

image_canvas.addEventListener('keydown', function(event){
    const keyName = event.key;
    switch(keyName){
        case 'Escape':
            polyStart = [];
            polyStarted = false;
            poly_context.clearRect(0, 0, poly_canvas.width, poly_canvas.height);
            break;
        case 'Shift':
            document.body.style.cursor = 'move';
            break;
        case 'Control':
            break;
        case 'Alt':
            document.body.style.cursor = 'none';
            cursor_canvas.style.visibility = 'visible';
            break;
        case 'Tab':
            showHide();
            break;
    }
    return event.preventDefault() && false;
}, false);

image_canvas.addEventListener('keyup', function(event){
    const keyName = event.key;
    switch(keyName){
        case 'Shift':
            document.body.style.cursor = 'default';
            break;
        case 'Control':
            break;
        case 'Alt':
            document.body.style.cursor = 'default';
            cursor_canvas.style.visibility = 'invisible';
            cursor_context.clearRect(0, 0, cursor_canvas.width, cursor_canvas.height);
            poly_context.clearRect(0, 0, poly_canvas.width, poly_canvas.height);
            break;
    }
    return event.preventDefault() && false;
}, false);

function trackTransforms(ctx){
    let svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
    let xform = svg.createSVGMatrix();
    ctx.getTransform = function(){ return xform; };

    let savedTransforms = [];
    let save = ctx.save;
    ctx.save = function(){
        savedTransforms.push(xform.translate(0,0));
        return save.call(ctx);
    };
    let restore = ctx.restore;
    ctx.restore = function(){
        xform = savedTransforms.pop();
        return restore.call(ctx);
    };
    let scale = ctx.scale;
    ctx.scale = function(sx,sy){
        xform = xform.scaleNonUniform(sx,sy);
        return scale.call(ctx,sx,sy);
    };
    let rotate = ctx.rotate;
    ctx.rotate = function(radians){
        xform = xform.rotate(radians*180/Math.PI);
        return rotate.call(ctx,radians);
    };
    let translate = ctx.translate;
    ctx.translate = function(dx,dy){
        xform = xform.translate(dx,dy);
        return translate.call(ctx,dx,dy);
    };
    let transform = ctx.transform;
    ctx.transform = function(a,b,c,d,e,f){
        let m2 = svg.createSVGMatrix();
        m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
        xform = xform.multiply(m2);
        return transform.call(ctx,a,b,c,d,e,f);
    };
    let setTransform = ctx.setTransform;
    ctx.setTransform = function(a,b,c,d,e,f){
        xform.a = a;
        xform.b = b;
        xform.c = c;
        xform.d = d;
        xform.e = e;
        xform.f = f;
        return setTransform.call(ctx,a,b,c,d,e,f);
    };
    ctx.transformedPoint = function(x,y){
        let pt  = svg.createSVGPoint();
        pt.x=x; pt.y=y;
        return pt.matrixTransform(xform.inverse());
    };
    ctx.getLastPoint = function(point){
        let pt  = svg.createSVGPoint();
        pt.x = point.x/ctx.canvas.offsetWidth*ctx.canvas.width;
        pt.y = point.x/ctx.canvas.offsetHeight*ctx.canvas.height;
        return pt;
    };
    ctx.getLastPointEvent = function(event){
        let pt  = svg.createSVGPoint();
        pt.x = event.offsetX/ctx.canvas.offsetWidth*ctx.canvas.width;
        pt.y = event.offsetY/ctx.canvas.offsetHeight*ctx.canvas.height;
        return pt;
    };
    ctx.transformedPointEvent = function(event){
        let pt = ctx.getLastPointEvent(event);
        return pt.matrixTransform(xform.inverse());
    };
    ctx.redraw = function(toBlack=false){
        if(ctx.image !== undefined) {
            let p1 = ctx.transformedPoint(0, 0);
            let p2 = ctx.transformedPoint(ctx.canvas.width, ctx.canvas.height);
            ctx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.drawImage(ctx.image, 0, 0);
        }
        if(toBlack){
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    };
    ctx.zoomBack = function(redraw=true){
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if(redraw) ctx.redraw();
    };
    ctx.zoom = function(x, y, delta){
        let pt = ctx.transformedPoint(x, y);
        let factor = 1+(delta*scaleFactor);

        ctx.translate(pt.x, pt.y);
        ctx.scale(factor, factor);
        ctx.translate(-pt.x, -pt.y);

        if(ctx.getTransform().a < 1) {
            ctx.zoomBack();
        }
        ctx.redraw();
    };
    ctx.zoomEvent = function(event){
        let pt = ctx.transformedPointEvent(event);
        let factor =  1+(event.wheelDelta*scaleFactor);

        ctx.translate(pt.x, pt.y);
        ctx.scale(factor, factor);
        ctx.translate(-pt.x, -pt.y);

        if(ctx.getTransform().a < 1) {
            ctx.zoomBack();
        }
        ctx.redraw();
    };
    ctx.drawPoly = function(pointList, event, fillStyle='green', strokeStyle='red', lineWidth = '2'){
        ctx.filter = 'none';
        if(event === undefined) {
            ctx.strokeStyle = 'rgba(0, 255, 0, 255)';
            ctx.lineWidth = '0';
            ctx.lineCap = 'square';
        } else {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'square';
        }
        ctx.beginPath();
        let pt = pointList[0];
        ctx.moveTo(pt.x, pt.y);
        for (let i = 1; i < pointList.length; i++) {
            pt = pointList[i];
            ctx.lineTo(pt.x, pt.y);
        }

        if(event === undefined) {
            ctx.closePath();
            ctx.fillStyle = 'rgba(0, 255, 0, 255)';
            ctx.fill();
            ctx.stroke();

            let xMin = 10000, yMin = 10000, xMax = 0, yMax = 0;
            for(let i=0; i < pointList.length; i++){
                if(pointList[i].x > xMax) xMax = Math.ceil(pointList[i].x);
                if(pointList[i].x < xMin) xMin = Math.floor(pointList[i].x);
                if(pointList[i].y > yMax) yMax = Math.ceil(pointList[i].y);
                if(pointList[i].y < yMin) yMin = Math.floor(pointList[i].y);
            }

            let im = ctx.getImageData(xMin-1, yMin-1, xMax-xMin+2, yMax-yMin+2);
            for (let x = 0; x < im.width; x++) {
                for(let y=0; y < im.height; y++) {
                    if(im.data[x*im.height*4 + y*4 + 3] < 127) im.data[x*im.height*4 + y*4 + 3] = 0;
                    else im.data[x*im.height*4 + y*4 + 3] = 255;
                }
            }
            ctx.putImageData(im, xMin-1, yMin-1);
        } else {
            let lastPoint = ctx.transformedPointEvent(event);
            ctx.lineTo(lastPoint.x, lastPoint.y);
            ctx.stroke();
        }
    };
}