define([
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
