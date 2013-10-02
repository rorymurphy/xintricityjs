(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'jQuery', 'underscrore', 'Backbone', 'XUtil', 'XMVVM', 'xin-sample-data'], factory);
    } else {
        // Browser globals
        root.xin_sample_viewmodel = factory({}, root.jQuery, root._, root.Backbone, root.XUtil, root.XMVVM, root.xin_sample_data);
    }
}(this, function(exports, $, _, Backbone, $x, mvvm, data){
    exports.viewmodel = mvvm.ViewModel.extend({
        view: 'template-playlist',
        fields: {
            NewSong: data.song //an empty sond that the form template can be bound to
        },
        initialize: function(){
          _.bindAll(this, 'isSkynyrd', 'toggleFavorite', 'addSong', 'removeSong');
          this.NewSong(new data.song());  
        },
        isSkynyrd: function(song){
            return song.Artist === "Lynyrd Skynyrd";
        },
        toggleFavorite: function(song){
            song.IsFavorite(!song.IsFavorite());
        },
        addSong: function(){
            this.model().Songs().add(this.NewSong());
            this.NewSong(new data.song());
            console.log('time to add the song');
        },
        removeSong: function(song){
            this.model().Songs().remove(song);
        }
    });
    
    return exports.viewmodel;
}));


