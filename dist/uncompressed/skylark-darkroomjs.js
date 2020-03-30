/**
 * skylark-darkroomjs - A version of darkroomjs that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-darkroomjs/
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx/skylark");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-darkroomjs/Darkroom',[
    "skylark-langx/skylark",
    "skylark-langx/langx",
    "skylark-domx-noder",
    "skylark-domx-finder",
    "skylark-widgets-base/Widget",
    "skylark-fabric"
], function(skylark, langx, noder,finder,Widget,fabric) {
  'use strict';

  var Plugins = {};

  function computeImageViewPort(image) {
    //return {
    //  height : image.height,
    //  width : image.width
    //};
    return {
      height: Math.abs(image.getScaledWidth() * (Math.sin(image.angle * Math.PI/180))) + Math.abs(image.getScaledHeight() * (Math.cos(image.angle * Math.PI/180))),
      width: Math.abs(image.getScaledHeight() * (Math.sin(image.angle * Math.PI/180))) + Math.abs(image.getScaledWidth() * (Math.cos(image.angle * Math.PI/180))),
    }
  }

 // Toolbar object.
  function Toolbar(element) {
    this.element = element;
  }

  Toolbar.prototype = {
    createButtonGroup: function(options) {
      var buttonGroup = document.createElement('div');
      buttonGroup.className = 'darkroom-button-group';
      this.element.appendChild(buttonGroup);

      return new ButtonGroup(buttonGroup);
    }
  };

  // ButtonGroup object.
  function ButtonGroup(element) {
    this.element = element;
  }

  ButtonGroup.prototype = {
    createButton: function(options) {
      var defaults = {
        image: 'help',
        type: 'default',
        group: 'default',
        hide: false,
        disabled: false
      };

      options = langx.mixin({},defaults,options);

      var buttonElement = document.createElement('button');
      buttonElement.type = 'button';
      buttonElement.className = 'darkroom-button darkroom-button-' + options.type;
      buttonElement.innerHTML = '<svg class="darkroom-icon"><use xlink:href="#' + options.image + '" /></svg>';
      this.element.appendChild(buttonElement);

      var button = new Button(buttonElement);
      button.hide(options.hide);
      button.disable(options.disabled);

      return button;
    }
  }

  // Button object.
  function Button(element) {
    this.element = element;
  }

  Button.prototype = {
    addEventListener: function(eventName, listener) {
      if (this.element.addEventListener){
        this.element.addEventListener(eventName, listener);
      } else if (this.element.attachEvent) {
        this.element.attachEvent('on' + eventName, listener);
      }
    },
    removeEventListener: function(eventName, listener) {
      if (this.element.removeEventListener){
        this.element.removeEventListener(eventName, listener);
      }
    },
    active: function(value) {
      if (value)
        this.element.classList.add('darkroom-button-active');
      else
        this.element.classList.remove('darkroom-button-active');
    },
    hide: function(value) {
      if (value)
        this.element.classList.add('darkroom-button-hidden');
      else
        this.element.classList.remove('darkroom-button-hidden');
    },
    disable: function(value) {
      this.element.disabled = (value) ? true : false;
    }
  };

  var Darkroom = Widget.inherit({
    klassName : "Darkroom",

    /*
     * @param {Element} el The container element. 
     */
    _construct : function(el,options,plugins) {
      if (typeof el === 'string') {
        el = finder.find(el);
      }

      this._initializeDOM(el);
      this.overrided(this.containerElement,options);
      //this.options = langx.mixin({}, this.defaults,options);

      // List of the instancied plugins
      this.plugins = {};

//      var image = new Image();
//      image.onload = function() {
        // Initialize the DOM/fabric elements
        this._initializeImage();

        // Then initialize the plugins
        this._initializePlugins();

        // Public method to adjust image according to the canvas
        this.refresh(function() {
          // Execute a custom callback after initialization
          this.options.initialize.bind(this).call();
        }.bind(this));

  //    }.bind(this)

      //image.crossOrigin = 'anonymous';
      //image.src = el.src;
    },

    // Reference to the main container element
    containerElement: null,

    // Reference to the fabric canvas object
    canvas: null,

    // Reference to the fabric image object
    image: null,

    // Reference to the fabric source canvas object
    sourceCanvas: null,

    // Reference to the fabric source image object
    sourceImage: null,

    // Track of the original image element
    originalImageElement: null,

    // Stack of transformations to apply to the image source
    transformations: [],

    // Default options
    options: {
      // Canvas properties (dimension, ratio, color)
      minWidth: null,
      minHeight: null,
      maxWidth: null,
      maxHeight: null,
      ratio: null,
      backgroundColor: '#fff',

      // Plugins options
      plugins: {},

      // Post-initialisation callback
      initialize: function() { /* noop */ }
    },



    selfDestroy: function() {
      var container = this.containerElement;
      var image = new Image();
      image.onload = function() {
        container.parentNode.replaceChild(image, container);
      }

      image.src = this.sourceImage.toDataURL();
    },

    // Add ability to attach event listener on the core object.
    // It uses the canvas element to process events.
    addEventListener: function(eventName, callback) {
      var el = this.canvas.getElement();
      if (el.addEventListener){
        el.addEventListener(eventName, callback);
      } else if (el.attachEvent) {
        el.attachEvent('on' + eventName, callback);
      }
    },

    dispatchEvent: function(eventName) {
      // Use the old way of creating event to be IE compatible
      // See https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events
      var event = document.createEvent('Event');
      event.initEvent(eventName, true, true);

      this.canvas.getElement().dispatchEvent(event);
    },

    // Adjust image & canvas dimension according to min/max width/height
    // and ratio specified in the options.
    // This method should be called after each image transformation.
    refresh: function(next) {
      var clone = new Image();
      clone.onload = function() {
        this._replaceCurrentImage(new fabric.Image(clone));

        if (next) next();
      }.bind(this);
      clone.src = this.sourceImage.toDataURL();
    },

    _replaceCurrentImage: function(newImage) {
      if (this.image) {
        this.image.canvas.remove(this.image);
      }

      this.image = newImage;
      this.image.selectable = false;

      // Adjust width or height according to specified ratio
      var viewport = computeImageViewPort(this.image);
      var canvasWidth = viewport.width;
      var canvasHeight = viewport.height;

      if (null !== this.options.ratio) {
        var canvasRatio = +this.options.ratio;
        var currentRatio = canvasWidth / canvasHeight;

        if (currentRatio > canvasRatio) {
          canvasHeight = canvasWidth / canvasRatio;
        } else if (currentRatio < canvasRatio) {
          canvasWidth = canvasHeight * canvasRatio;
        }
      }

      // Then scale the image to fit into dimension limits
      var scaleMin = 1;
      var scaleMax = 1;
      var scaleX = 1;
      var scaleY = 1;

      if (null !== this.options.maxWidth && this.options.maxWidth < canvasWidth) {
        scaleX =  this.options.maxWidth / canvasWidth;
      }
      if (null !== this.options.maxHeight && this.options.maxHeight < canvasHeight) {
        scaleY =  this.options.maxHeight / canvasHeight;
      }
      scaleMin = Math.min(scaleX, scaleY);

      scaleX = 1;
      scaleY = 1;
      if (null !== this.options.minWidth && this.options.minWidth > canvasWidth) {
        scaleX =  this.options.minWidth / canvasWidth;
      }
      if (null !== this.options.minHeight && this.options.minHeight > canvasHeight) {
        scaleY =  this.options.minHeight / canvasHeight;
      }
      scaleMax = Math.max(scaleX, scaleY);

      var scale = scaleMax * scaleMin; // one should be equals to 1

      canvasWidth *= scale;
      canvasHeight *= scale;

      // Finally place the image in the center of the canvas
      this.image.scaleX = (1 * scale);
      this.image.scaleY = (1 * scale);
      this.canvas.add(this.image);
      this.canvas.setWidth(canvasWidth);
      this.canvas.setHeight(canvasHeight);
      this.canvas.centerObject(this.image);
      this.image.setCoords();
    },

    // Apply the transformation on the current image and save it in the
    // transformations stack (in order to reconstitute the previous states
    // of the image).
    applyTransformation: function(transformation) {
      this.transformations.push(transformation);

      transformation.applyTransformation(
        this.sourceCanvas,
        this.sourceImage,
        this._postTransformation.bind(this)
      );
    },

    _postTransformation: function(newImage) {
      if (newImage)
        this.sourceImage = newImage;

      this.refresh(function() {
        this.dispatchEvent('core:transformation');
      }.bind(this));
    },

    // Initialize image from original element plus re-apply every
    // transformations.
    reinitializeImage: function() {
      this.canvas.remove(this.sourceImage);
      this._initializeImage();
      this._popTransformation(this.transformations.slice())
    },

    _popTransformation: function(transformations) {
      if (0 === transformations.length) {
        this.dispatchEvent('core:reinitialized');
        this.refresh();
        return;
      }

      var transformation = transformations.shift();

      var next = function(newImage) {
        if (newImage) this.sourceImage = newImage;
        this._popTransformation(transformations)
      };

      transformation.applyTransformation(
        this.sourceCanvas,
        this.sourceImage,
        next.bind(this)
      );
    },

    // Create the DOM elements and instanciate the fabric canvas.
    // The image element is replaced by a new `div` element.
    // However the original image is re-injected in order to keep a trace of it.
    _initializeDOM: function(imageElement) {
      // Container
      var mainContainerElement = document.createElement('div');
      mainContainerElement.className = 'darkroom-container';

      // Toolbar
      var toolbarElement = document.createElement('div');
      toolbarElement.className = 'darkroom-toolbar';
      mainContainerElement.appendChild(toolbarElement);

      // Viewport canvas
      var canvasContainerElement = document.createElement('div');
      canvasContainerElement.className = 'darkroom-image-container';
      var canvasElement = this.canvasElement = document.createElement('canvas');
      canvasContainerElement.appendChild(canvasElement);
      mainContainerElement.appendChild(canvasContainerElement);

      // Source canvas
      var sourceCanvasContainerElement = document.createElement('div');
      sourceCanvasContainerElement.className = 'darkroom-source-container';
      sourceCanvasContainerElement.style.display = 'none';
      var sourceCanvasElement = this.sourceCanvasElement = document.createElement('canvas');
      sourceCanvasContainerElement.appendChild(sourceCanvasElement);
      mainContainerElement.appendChild(sourceCanvasContainerElement);

      // Original image
      imageElement.parentNode.replaceChild(mainContainerElement, imageElement);
      imageElement.style.display = 'none';
      mainContainerElement.appendChild(imageElement);

      // Instanciate object from elements
      this.containerElement = mainContainerElement;
      this.originalImageElement = imageElement;

      this.toolbar = new Toolbar(toolbarElement);

    },

    // Instanciate the fabric image object.
    // The image is created as a static element with no control,
    // then it is add in the fabric canvas object.
    _initializeImage: function() {
      this.canvas = new fabric.Canvas(this.canvasElement, {
        selection: false,
        backgroundColor: this.options.backgroundColor
      });

      this.sourceCanvas = new fabric.Canvas(this.sourceCanvasElement, {
        selection: false,
        backgroundColor: this.options.backgroundColor
      });
 
      this.sourceImage = new fabric.Image(this.originalImageElement, {
        // Some options to make the image static
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        lockUniScaling: true,
        hasControls: false,
        hasBorders: false,
      });

      this.sourceCanvas.add(this.sourceImage);

      // Adjust width or height according to specified ratio
      var viewport = computeImageViewPort(this.sourceImage);
      var canvasWidth = viewport.width;
      var canvasHeight = viewport.height;

      this.sourceCanvas.setWidth(canvasWidth);
      this.sourceCanvas.setHeight(canvasHeight);
      this.sourceCanvas.centerObject(this.sourceImage);
      this.sourceImage.setCoords();
    },

    // Initialize every plugins.
    // Note that plugins are instanciated in the same order than they
    // are declared in the parameter object.
    _initializePlugins: function() {
      for (var name in Plugins) {
        var pluginInfo = Plugins[name];
        var options = this.options.plugins[name];

        // Setting false into the plugin options will disable the plugin
        if (options === false)
          continue;

        // Avoid any issues with _proto_
        if (!Plugins.hasOwnProperty(name))
          continue;

        this.plugins[name] = new pluginInfo.ctor(this, options);
      }
    }

  });


  Darkroom.Plugin = langx.Evented.inherit({
    klassName : "Plugin",

    defaults: {},

    init : function(Darkroom,options) {
      this.Darkroom = Darkroom;
      this.options = langx.mixin({},this.defaults,options);

    }
  });


  Darkroom.Transformation = langx.Evented.inherit({
    klassName : "Transformation",

    init : function(options) {
      this.options = options;
    }
  });


  Darkroom.installPlugin = function(setting) {

    //Plugins.push(setting);
    Plugins[setting.name] = setting;
  };

  return skylark.attach("intg.Darkroom",Darkroom);

});


define('skylark-darkroomjs/plugins/history',[
  "skylark-langx/langx",
  "skylark-domx-noder",
  "skylark-domx-query",
  "skylark-fabric",
  '../Darkroom',
],function(langx,noder, $, fabric,Darkroom) {
  'use strict';

  var HistoryPlugin= Darkroom.Plugin.inherit({
     undoTransformations: null,

     init : function(Darkroom,options) {
      this.overrided(Darkroom,options);
      this.undoTransformations = [];
      this._initButtons();

      this.Darkroom.addEventListener('core:transformation', this._onTranformationApplied.bind(this));
    },

    undo: function() {
      if (this.Darkroom.transformations.length === 0) {
        return;
      }

      var lastTransformation = this.Darkroom.transformations.pop();
      this.undoTransformations.unshift(lastTransformation);

      this.Darkroom.reinitializeImage();
      this._updateButtons();
    },

    redo: function() {
      if (this.undoTransformations.length === 0) {
        return;
      }

      var cancelTransformation = this.undoTransformations.shift();
      this.Darkroom.transformations.push(cancelTransformation);

      this.Darkroom.reinitializeImage();
      this._updateButtons();
    },

    _initButtons: function() {
      var buttonGroup = this.Darkroom.toolbar.createButtonGroup();

      this.backButton = buttonGroup.createButton({
        image: 'undo',
        disabled: true
      });

      this.forwardButton = buttonGroup.createButton({
        image: 'redo',
        disabled: true
      });

      this.backButton.addEventListener('click', this.undo.bind(this));
      this.forwardButton.addEventListener('click', this.redo.bind(this));

      return this;
    },

    _updateButtons: function() {
      this.backButton.disable((this.Darkroom.transformations.length === 0))
      this.forwardButton.disable((this.undoTransformations.length === 0))
    },

    _onTranformationApplied: function() {
      this.undoTransformations = [];
      this._updateButtons();
    }
  });

  var pluginInfo = {
    name : "history",
    ctor : HistoryPlugin
  };

  Darkroom.installPlugin(pluginInfo);

  return pluginInfo;

  
});

define('skylark-darkroomjs/plugins/crop',[
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

define('skylark-darkroomjs/plugins/rotate',[
  "skylark-langx/langx",
  "skylark-domx-noder",
  "skylark-domx-query",
  "skylark-fabric",
  '../Darkroom',
],function(langx,noder, $, fabric,Darkroom) {
  'use strict';

var Rotation = Darkroom.Transformation.inherit({

  applyTransformation: function(canvas, image, next) {
    var angle = (image.angle + this.options.angle) % 360;
    image.rotate(angle);

    var width, height;
    height = Math.abs(image.getScaledWidth()*(Math.sin(angle*Math.PI/180)))+Math.abs(image.getScaledHeight()*(Math.cos(angle*Math.PI/180)));
    width = Math.abs(image.getScaledHeight()*(Math.sin(angle*Math.PI/180)))+Math.abs(image.getScaledWidth()*(Math.cos(angle*Math.PI/180)));

    canvas.setWidth(width);
    canvas.setHeight(height);

    canvas.centerObject(image);
    image.setCoords();
    canvas.renderAll();

    next();
  }
});


  var RotatePlugin = Darkroom.Plugin.inherit({
    init: function(Darkroom,options) {
      this.overrided(Darkroom,options);
      var buttonGroup = this.Darkroom.toolbar.createButtonGroup();

      var leftButton = buttonGroup.createButton({
        image: 'rotate-left'
      });

      var rightButton = buttonGroup.createButton({
        image: 'rotate-right'
      });

      leftButton.addEventListener('click', this.rotateLeft.bind(this));
      rightButton.addEventListener('click', this.rotateRight.bind(this));
    },

    rotateLeft: function() {
      this.rotate(-90);
    },

    rotateRight: function() {
      this.rotate(90);
    },

    rotate: function rotate(angle) {
      this.Darkroom.applyTransformation(
        new Rotation({angle: angle})
      );
    }
  });

  var pluginInfo = {
    name : "rotate",
    ctor : RotatePlugin
  };

  Darkroom.installPlugin(pluginInfo);

  return pluginInfo;

});

define('skylark-darkroomjs/plugins/save',[
  "skylark-langx/langx",
  "skylark-domx-noder",
  "skylark-domx-query",
  "skylark-fabric",
  '../Darkroom',
],function(langx,noder, $, fabric,Darkroom) {
  'use strict';

  var SavePlugin= Darkroom.Plugin.inherit({

    defaults: {
      callback: function() {
        this.Darkroom.selfDestroy();
      }
    },

    init: function(Darkroom,options) {
      this.overrided(Darkroom,options);

      var buttonGroup = this.Darkroom.toolbar.createButtonGroup();

      this.destroyButton = buttonGroup.createButton({
        image: 'save'
      });

      this.destroyButton.addEventListener('click', this.options.callback.bind(this));
    },
  });

  var pluginInfo = {
    name : "save",
    ctor : SavePlugin
  };

  Darkroom.installPlugin(pluginInfo);

  return pluginInfo;  

});

define('skylark-darkroomjs/main',[
    "./Darkroom",
    "./plugins/history",
    "./plugins/crop",
    "./plugins/rotate",
    "./plugins/save"
], function(Darkroom) {
    return Darkroom;
})
;
define('skylark-darkroomjs', ['skylark-darkroomjs/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-darkroomjs.js.map
