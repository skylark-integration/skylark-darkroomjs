define([
  "skylark-langx/langx",
  "skylark-domx-noder",
  "skylark-domx-images",
  "skylark-domx-query",
  "skylark-fabric",
  '../Darkroom',
],function(langx,noder, images,$, fabric,Darkroom) {
  'use strict';

  function computeImageViewPort(image) {
    //return {
    //  height : image.height,
    //  width : image.width
    //};
    return {
      height: Math.abs(image.getScaledWidth() * (Math.sin(image.get("angle") * Math.PI/180))) + Math.abs(image.getScaledHeight() * (Math.cos(image.get("angle") * Math.PI/180))),
      width: Math.abs(image.getScaledHeight() * (Math.sin(image.get("angle") * Math.PI/180))) + Math.abs(image.getScaledWidth() * (Math.cos(image.get("angle") * Math.PI/180))),
    }
  }
  

  var Crop = Darkroom.Transformation.inherit({
    applyTransformation: function(canvas, image, next) {
      // Snapshot the image delimited by the crop zone
      var snapshot = new Image();

      var viewport = computeImageViewPort(image);
      var imageWidth = viewport.width;
      var imageHeight = viewport.height;

      var left = this.options.left * imageWidth;
      var top = this.options.top * imageHeight;
      var width = Math.min(this.options.width * imageWidth, imageWidth - left);
      var height = Math.min(this.options.height * imageHeight, imageHeight - top);

      snapshot.src = canvas.toDataURL({
        left: left,
        top: top,
        width: width,
        height: height,
      });

      images.loaded(snapshot).then(function() {
        // Validate image
        if (height < 1 || width < 1)
          return;

        var imgInstance = new fabric.Image(snapshot, {
          // options to make the image static
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          lockUniScaling: true,
          hasControls: false,
          hasBorders: false
        });

        var width = snapshot.width;
        var height = snapshot.height;

        // Update canvas size
        canvas.setWidth(width);
        canvas.setHeight(height);

        // Add image
        canvas.remove(image);
        canvas.add(imgInstance);

        next(imgInstance);
      });
    }
  });

  var CropZone = fabric.util.createClass(fabric.Rect, {
    _render: function(ctx) {
      this.callSuper('_render', ctx);

      var canvas = ctx.canvas;
      var dashWidth = 7;

      // Set original scale
      var flipX = this.flipX ? -1 : 1;
      var flipY = this.flipY ? -1 : 1;
      var scaleX = flipX / this.scaleX;
      var scaleY = flipY / this.scaleY;

      ctx.scale(scaleX, scaleY);

      // Overlay rendering
      //ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; //modifeied by lwf
      this._renderOverlay(ctx);

      // Set dashed borders
      if (ctx.setLineDash !== undefined)
        ctx.setLineDash([dashWidth, dashWidth]);
      else if (ctx.mozDash !== undefined)
        ctx.mozDash = [dashWidth, dashWidth];

      // First lines rendering with black
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      this._renderBorders(ctx);
      this._renderGrid(ctx);

      // Re render lines in white
      ctx.lineDashOffset = dashWidth;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      this._renderBorders(ctx);
      this._renderGrid(ctx);

      // Reset scale
      ctx.scale(1/scaleX, 1/scaleY);
    },

    _renderOverlay: function(ctx) {
      var canvas = ctx.canvas;

      //
      //    x0    x1        x2      x3
      // y0 +------------------------+
      //    |\\\\\\\\\\\\\\\\\\\\\\\\|
      //    |\\\\\\\\\\\\\\\\\\\\\\\\|
      // y1 +------+---------+-------+
      //    |\\\\\\|         |\\\\\\\|
      //    |\\\\\\|    0    |\\\\\\\|
      //    |\\\\\\|         |\\\\\\\|
      // y2 +------+---------+-------+
      //    |\\\\\\\\\\\\\\\\\\\\\\\\|
      //    |\\\\\\\\\\\\\\\\\\\\\\\\|
      // y3 +------------------------+
      //

      var x0 = Math.ceil(-this.getScaledWidth() / 2 - this.left);
      var x1 = Math.ceil(-this.getScaledWidth() / 2);
      var x2 = Math.ceil(this.getScaledWidth() / 2);
      var x3 = Math.ceil(this.getScaledWidth() / 2 + (canvas.width - this.getScaledWidth() - this.left));

      var y0 = Math.ceil(-this.getScaledHeight() / 2 - this.top);
      var y1 = Math.ceil(-this.getScaledHeight() / 2);
      var y2 = Math.ceil(this.getScaledHeight() / 2);
      var y3 = Math.ceil(this.getScaledHeight() / 2 + (canvas.height - this.getScaledHeight() - this.top));

      ctx.beginPath();
      
      // Draw outer rectangle.
      // Numbers are +/-1 so that overlay edges don't get blurry.
      ctx.moveTo(x0 - 1, y0 - 1);
      ctx.lineTo(x3 + 1, y0 - 1);
      ctx.lineTo(x3 + 1, y3 + 1);
      ctx.lineTo(x0 - 1, y3 - 1);
      ctx.lineTo(x0 - 1, y0 - 1);
      ctx.closePath();

      // Draw inner rectangle.
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x1, y1);

      ctx.closePath();
      ctx.fill();
    },

    _renderBorders: function(ctx) {
      ctx.beginPath();
      ctx.moveTo(-this.getScaledWidth()/2, -this.getScaledHeight()/2); // upper left
      ctx.lineTo(this.getScaledWidth()/2, -this.getScaledHeight()/2); // upper right
      ctx.lineTo(this.getScaledWidth()/2, this.getScaledHeight()/2); // down right
      ctx.lineTo(-this.getScaledWidth()/2, this.getScaledHeight()/2); // down left
      ctx.lineTo(-this.getScaledWidth()/2, -this.getScaledHeight()/2); // upper left
      ctx.stroke();
    },

    _renderGrid: function(ctx) {
      
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(-this.getScaledWidth()/2 + 1/3 * this.getScaledWidth(), -this.getScaledHeight()/2);
      ctx.lineTo(-this.getScaledWidth()/2 + 1/3 * this.getScaledWidth(), this.getScaledHeight()/2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-this.getScaledWidth()/2 + 2/3 * this.getScaledWidth(), -this.getScaledHeight()/2);
      ctx.lineTo(-this.getScaledWidth()/2 + 2/3 * this.getScaledWidth(), this.getScaledHeight()/2);
      ctx.stroke();
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(-this.getScaledWidth()/2, -this.getScaledHeight()/2 + 1/3 * this.getScaledHeight());
      ctx.lineTo(this.getScaledWidth()/2, -this.getScaledHeight()/2 + 1/3 * this.getScaledHeight());
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-this.getScaledWidth()/2, -this.getScaledHeight()/2 + 2/3 * this.getScaledHeight());
      ctx.lineTo(this.getScaledWidth()/2, -this.getScaledHeight()/2 + 2/3 * this.getScaledHeight());
      ctx.stroke();
    }
  });

  var CropPlugin = Darkroom.Plugin.inherit({
    // Init point
    startX: null,
    startY: null,

    // Keycrop
    isKeyCroping: false,
    isKeyLeft: false,
    isKeyUp: false,

    defaults: {
      // min crop dimension
      minHeight: 1,
      minWidth: 1,
      // ensure crop ratio
      ratio: null,
      // quick crop feature (set a key code to enable it)
      quickCropKey: false
    },

     init : function(Darkroom,options) {
      this.overrided(Darkroom,options);
      var buttonGroup = this.Darkroom.toolbar.createButtonGroup();

      this.cropButton = buttonGroup.createButton({
        image: 'crop'
      });
      this.okButton = buttonGroup.createButton({
        image: 'done',
        type: 'success',
        hide: true
      });
      this.cancelButton = buttonGroup.createButton({
        image: 'close',
        type: 'danger',
        hide: true
      });

      // Buttons click
      this.cropButton.addEventListener('click', this.toggleCrop.bind(this));
      this.okButton.addEventListener('click', this.cropCurrentZone.bind(this));
      this.cancelButton.addEventListener('click', this.releaseFocus.bind(this));

      // Canvas events
      this.Darkroom.canvas.on('mouse:down', this.onMouseDown.bind(this));
      this.Darkroom.canvas.on('mouse:move', this.onMouseMove.bind(this));
      this.Darkroom.canvas.on('mouse:up', this.onMouseUp.bind(this));
      this.Darkroom.canvas.on('object:moving', this.onObjectMoving.bind(this));
      this.Darkroom.canvas.on('object:scaling', this.onObjectScaling.bind(this));

      fabric.util.addListener(document, 'keydown', this.onKeyDown.bind(this));
      fabric.util.addListener(document, 'keyup', this.onKeyUp.bind(this));

      this.Darkroom.addEventListener('core:transformation', this.releaseFocus.bind(this));
    },

    // Avoid crop zone to go beyond the canvas edges
    onObjectMoving: function(event) {
      if (!this.hasFocus()) {
        return;
      }

      var currentObject = event.target;
      if (currentObject !== this.cropZone)
        return;

      var canvas = this.Darkroom.canvas;
      var x = currentObject.left, y = currentObject.top;
      var w = currentObject.getScaledWidth(), h = currentObject.getScaledHeight();
      var maxX = canvas.getWidth() - w;
      var maxY = canvas.getHeight() - h;

      if (x < 0)
        currentObject.set('left', 0);
      if (y < 0)
        currentObject.set('top', 0);
      if (x > maxX)
        currentObject.set('left', maxX);
      if (y > maxY)
        currentObject.set('top', maxY);

      this.Darkroom.dispatchEvent('crop:update');
    },

    // Prevent crop zone from going beyond the canvas edges (like mouseMove)
    onObjectScaling: function(event) {
      if (!this.hasFocus()) {
        return;
      }

      var preventScaling = false;
      var currentObject = event.target;
      if (currentObject !== this.cropZone)
        return;

      var canvas = this.Darkroom.canvas;
      var pointer = canvas.getPointer(event.e);
      var x = pointer.x;
      var y = pointer.y;

      var minX = currentObject.left;
      var minY = currentObject.top;
      var maxX = currentObject.left + currentObject.getScaledWidth();
      var maxY = currentObject.top + currentObject.getScaledHeight();

      if (null !== this.options.ratio) {
        if (minX < 0 || maxX > canvas.getWidth() || minY < 0 || maxY > canvas.getHeight()) {
          preventScaling = true;
        }
      }

      if (minX < 0 || maxX > canvas.getWidth() || preventScaling) {
        var lastScaleX = this.lastScaleX || 1;
        currentObject.setScaleX(lastScaleX);
      }
      if (minX < 0) {
        currentObject.setLeft(0);
      }

      if (minY < 0 || maxY > canvas.getHeight() || preventScaling) {
        var lastScaleY = this.lastScaleY || 1;
        currentObject.setScaleY(lastScaleY);
      }
      if (minY < 0) {
        currentObject.setTop(0);
      }

      if (currentObject.get("width") < this.options.minWidth) {
        currentObject.scaleToWidth(this.options.minWidth);
      }
      if (currentObject.get("height") < this.options.minHeight) {
        currentObject.scaleToHeight(this.options.minHeight);
      }

      this.lastScaleX = currentObject.get("scaleX");
      this.lastScaleY = currentObject.get("scaleY");

      this.Darkroom.dispatchEvent('crop:update');
    },

    // Init crop zone
    onMouseDown: function(event) {
      if (!this.hasFocus()) {
        return;
      }

      var canvas = this.Darkroom.canvas;

      // recalculate offset, in case canvas was manipulated since last `calcOffset`
      canvas.calcOffset();
      var pointer = canvas.getPointer(event.e);
      var x = pointer.x;
      var y = pointer.y;
      var point = new fabric.Point(x, y);

      // Check if user want to scale or drag the crop zone.
      var activeObject = canvas.getActiveObject();
      if (activeObject === this.cropZone || this.cropZone.containsPoint(point)) {
        return;
      }

      canvas.discardActiveObject();
      this.cropZone.set("width",0);
      this.cropZone.set("height",0);
      this.cropZone.set("scaleX",1);
      this.cropZone.set("scaleY",1);

      this.startX = x;
      this.startY = y;
    },

    // Extend crop zone
    onMouseMove: function(event) {
      // Quick crop feature
      if (this.isKeyCroping)
        return this.onMouseMoveKeyCrop(event);

      if (null === this.startX || null === this.startY) {
        return;
      }

      var canvas = this.Darkroom.canvas;
      var pointer = canvas.getPointer(event.e);
      var x = pointer.x;
      var y = pointer.y;

      this._renderCropZone(this.startX, this.startY, x, y);
    },

    onMouseMoveKeyCrop: function(event) {
      var canvas = this.Darkroom.canvas;
      var zone = this.cropZone;

      var pointer = canvas.getPointer(event.e);
      var x = pointer.x;
      var y = pointer.y;

      if (!zone.left || !zone.top) {
        zone.set("top",y);
        zone.set("left",x);
      }

      this.isKeyLeft =  x < zone.left + zone.width / 2 ;
      this.isKeyUp = y < zone.top + zone.height / 2 ;

      this._renderCropZone(
        Math.min(zone.left, x),
        Math.min(zone.top, y),
        Math.max(zone.left+zone.width, x),
        Math.max(zone.top+zone.height, y)
      );
    },

    // Finish crop zone
    onMouseUp: function(event) {
      if (null === this.startX || null === this.startY) {
        return;
      }

      var canvas = this.Darkroom.canvas;
      this.cropZone.setCoords();
      canvas.setActiveObject(this.cropZone);
      canvas.calcOffset();

      this.startX = null;
      this.startY = null;
    },

    onKeyDown: function(event) {
      if (false === this.options.quickCropKey || event.keyCode !== this.options.quickCropKey || this.isKeyCroping)
        return;

      // Active quick crop flow
      this.isKeyCroping = true ;
      this.Darkroom.canvas.discardActiveObject();
      this.cropZone.set("width",0);
      this.cropZone.set("height",0);
      this.cropZone.set("scaleX",1);
      this.cropZone.set("scaleY",1);
      this.cropZone.set("top",0);
      this.cropZone.set("left",0);
    },

    onKeyUp: function(event) {
      if (false === this.options.quickCropKey || event.keyCode !== this.options.quickCropKey || !this.isKeyCroping)
        return;

      // Unactive quick crop flow
      this.isKeyCroping = false;
      this.startX = 1;
      this.startY = 1;
      this.onMouseUp();
    },

    selectZone: function(x, y, width, height, forceDimension) {
      if (!this.hasFocus())
        this.requireFocus();

      if (!forceDimension) {
        this._renderCropZone(x, y, x+width, y+height);
      } else {
        this.cropZone.set({
          'left': x,
          'top': y,
          'width': width,
          'height': height
        });
      }

      var canvas = this.Darkroom.canvas;
      canvas.bringToFront(this.cropZone);
      this.cropZone.setCoords();
      canvas.setActiveObject(this.cropZone);
      canvas.calcOffset();

      this.Darkroom.dispatchEvent('crop:update');
    },

    toggleCrop: function() {
      if (!this.hasFocus())
        this.requireFocus();
      else
        this.releaseFocus();
    },

    cropCurrentZone: function() {
      if (!this.hasFocus())
        return;

      // Avoid croping empty zone
      if (this.cropZone.width < 1 && this.cropZone.height < 1)
        return;

      var image = this.Darkroom.image;

      // Compute crop zone dimensions
      var top = this.cropZone.get("top") - image.get("top");
      var left = this.cropZone.get("left") - image.get("left");
      var width = this.cropZone.get("width");
      var height = this.cropZone.get("height");

      // Adjust dimensions to image only
      if (top < 0) {
        height += top;
        top = 0;
      }

      if (left < 0) {
        width += left;
        left = 0;
      }

      // Apply crop transformation.
      // Make sure to use relative dimension since the crop will be applied
      // on the source image.
      this.Darkroom.applyTransformation(new Crop({
        top: top / image.getScaledHeight(),
        left: left / image.getScaledWidth(),
        width: width / image.getScaledWidth(),
        height: height / image.getScaledHeight(),
      }));
    },

    // Test wether crop zone is set
    hasFocus: function() {
      return this.cropZone !== undefined;
    },

    // Create the crop zone
    requireFocus: function() {
      this.cropZone = new CropZone({
        fill: 'transparent',
        hasBorders: false,
        originX: 'left',
        originY: 'top',
        //stroke: '#444',
        //strokeDashArray: [5, 5],
        //borderColor: '#444',
        cornerColor: '#444',
        cornerSize: 8,
        transparentCorners: false,
        lockRotation: true,
        hasRotatingPoint: false,
      });

      if (null !== this.options.ratio) {
        this.cropZone.set('lockUniScaling', true);
      }

      this.Darkroom.canvas.add(this.cropZone);
      this.Darkroom.canvas.defaultCursor = 'crosshair';

      this.cropButton.active(true);
      this.okButton.hide(false);
      this.cancelButton.hide(false);
    },

    // Remove the crop zone
    releaseFocus: function() {
      if (undefined === this.cropZone)
        return;

      this.cropZone.canvas.remove(this.cropZone);
      this.cropZone = undefined;

      this.cropButton.active(false);
      this.okButton.hide(true);
      this.cancelButton.hide(true);

      this.Darkroom.canvas.defaultCursor = 'default';

      this.Darkroom.dispatchEvent('crop:update');
    },

    _renderCropZone: function(fromX, fromY, toX, toY) {
      var canvas = this.Darkroom.canvas;

      var isRight = (toX > fromX);
      var isLeft = !isRight;
      var isDown = (toY > fromY);
      var isUp = !isDown;

      var minWidth = Math.min(+this.options.minWidth, canvas.getWidth());
      var minHeight = Math.min(+this.options.minHeight, canvas.getHeight());

      // Define corner coordinates
      var leftX = Math.min(fromX, toX);
      var rightX = Math.max(fromX, toX);
      var topY = Math.min(fromY, toY);
      var bottomY = Math.max(fromY, toY);

      // Replace current point into the canvas
      leftX = Math.max(0, leftX);
      rightX = Math.min(canvas.getWidth(), rightX);
      topY = Math.max(0, topY)
      bottomY = Math.min(canvas.getHeight(), bottomY);

      // Recalibrate coordinates according to given options
      if (rightX - leftX < minWidth) {
        if (isRight)
          rightX = leftX + minWidth;
        else
          leftX = rightX - minWidth;
      }
      if (bottomY - topY < minHeight) {
        if (isDown)
          bottomY = topY + minHeight;
        else
          topY = bottomY - minHeight;
      }

      // Truncate truncate according to canvas dimensions
      if (leftX < 0) {
        // Translate to the left
        rightX += Math.abs(leftX);
        leftX = 0
      }
      if (rightX > canvas.getWidth()) {
        // Translate to the right
        leftX -= (rightX - canvas.getWidth());
        rightX = canvas.getWidth();
      }
      if (topY < 0) {
        // Translate to the bottom
        bottomY += Math.abs(topY);
        topY = 0
      }
      if (bottomY > canvas.getHeight()) {
        // Translate to the right
        topY -= (bottomY - canvas.getHeight());
        bottomY = canvas.getHeight();
      }

      var width = rightX - leftX;
      var height = bottomY - topY;
      var currentRatio = width / height;

      if (this.options.ratio && +this.options.ratio !== currentRatio) {
        var ratio = +this.options.ratio;

        if(this.isKeyCroping) {
          isLeft = this.isKeyLeft;
          isUp = this.isKeyUp;
        }

        if (currentRatio < ratio) {
          var newWidth = height * ratio;
          if (isLeft) {
            leftX -= (newWidth - width);
          }
          width = newWidth;
        } else if (currentRatio > ratio) {
          var newHeight = height / (ratio * height/width);
          if (isUp) {
            topY -= (newHeight - height);
          }
          height = newHeight;
        }

        if (leftX < 0) {
          leftX = 0;
          //TODO
        }
        if (topY < 0) {
          topY = 0;
          //TODO
        }
        if (leftX + width > canvas.getWidth()) {
          var newWidth = canvas.getWidth() - leftX;
          height = newWidth * height / width;
          width = newWidth;
          if (isUp) {
            topY = fromY - height;
          }
        }
        if (topY + height > canvas.getHeight()) {
          var newHeight = canvas.getHeight() - topY;
          width = width * newHeight / height;
          height = newHeight;
          if (isLeft) {
            leftX = fromX - width;
          }
        }
      }

      // Apply coordinates
      this.cropZone.left = leftX;
      this.cropZone.top = topY;
      this.cropZone.width = width;
      this.cropZone.height = height;

      this.Darkroom.canvas.bringToFront(this.cropZone);

      this.Darkroom.dispatchEvent('crop:update');
    }
  });

  var pluginInfo = {
    name : "crop",
    ctor : CropPlugin
  };

  Darkroom.installPlugin(pluginInfo);

  return pluginInfo;

});
