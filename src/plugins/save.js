define([
  "skylark-langx/langx",
  "skylark-utils/noder",
  "skylark-utils/query",
  "skylark-utils-canvas2d",
  '../Imager',
],function(langx,noder, $, canvas2d,Imager) {
  'use strict';

  var SavePlugin= Imager.Plugin.inherit({

    defaults: {
      callback: function() {
        this.imager.selfDestroy();
      }
    },

    init: function(imager,options) {
      this.overrided(imager,options);

      var buttonGroup = this.imager.toolbar.createButtonGroup();

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

  Imager.installPlugin(pluginInfo);

  return pluginInfo;  

});
