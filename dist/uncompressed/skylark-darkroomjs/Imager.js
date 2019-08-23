define([
    "skylark-langx/skylark",
    "skylark-langx/langx",
    "skylark-utils-dom/noder",
    "skylark-utils-dom/finder",
    "skylark-ui-swt/Widget",
    "skylark-graphics-canvas2d"
], function(skylark, langx, noder,finder,Widget,canvas2d) {
  'use strict';

  var Plugins = {};

  function computeImageViewPort(image) {
    //return {
    //  height : image.height,
    //  width : image.width
    //};
    return {
      height: Math.abs(image.getWidth() * (Math.sin(image.getAngle() * Math.PI/180))) + Math.abs(image.getHeight() * (Math.cos(image.getAngle() * Math.PI/180))),
      width: Math.abs(image.getHeight() * (Math.sin(image.getAngle() * Math.PI/180))) + Math.abs(image.getWidth() * (Math.cos(image.getAngle() * Math.PI/180))),
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

  var Imager = Widget.inherit({
    klassName : "Imager",

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
        // Initialize the DOM/canvas2d elements
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

    // Reference to the canvas2d canvas object
    canvas: null,

    // Reference to the canvas2d image object
    image: null,

    // Reference to the canvas2d source canvas object
    sourceCanvas: null,

    // Reference to the canvas2d source image object
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
        this._replaceCurrentImage(new canvas2d.Image(clone));

        if (next) next();
      }.bind(this);
      clone.src = this.sourceImage.toDataURL();
    },

    _replaceCurrentImage: function(newImage) {
      if (this.image) {
        this.image.remove();
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
      this.image.setScaleX(1 * scale);
      this.image.setScaleY(1 * scale);
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
      this.sourceImage.remove();
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

    // Create the DOM elements and instanciate the canvas2d canvas.
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

    // Instanciate the canvas2d image object.
    // The image is created as a static element with no control,
    // then it is add in the canvas2d canvas object.
    _initializeImage: function() {
      this.canvas = new canvas2d.Canvas(this.canvasElement, {
        selection: false,
        backgroundColor: this.options.backgroundColor
      });

      this.sourceCanvas = new canvas2d.Canvas(this.sourceCanvasElement, {
        selection: false,
        backgroundColor: this.options.backgroundColor
      });
 
      this.sourceImage = new canvas2d.Image(this.originalImageElement, {
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


  Imager.Plugin = langx.Evented.inherit({
    klassName : "Plugin",

    defaults: {},

    init : function(imager,options) {
      this.imager = imager;
      this.options = langx.mixin({},this.defaults,options);

    }
  });


  Imager.Transformation = langx.Evented.inherit({
    klassName : "Transformation",

    init : function(options) {
      this.options = options;
    }
  });


  Imager.installPlugin = function(setting) {

    //Plugins.push(setting);
    Plugins[setting.name] = setting;
  };

  return skylark.attach("itg.darkroomjs.Imager",Imager);

});

