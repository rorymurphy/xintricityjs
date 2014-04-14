(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('xin-sample-data', ['exports', 'jquery', 'underscrore', 'Backbone', 'xutil', 'xmvvm'], factory);
    } else {
        // Browser globals
        root.xin_sample_data = factory({}, root.jQuery, root._, root.Backbone, root.XUtil, root.XMVVM);
    }
}(this, function(exports, $,_,Backbone,$x,mvvm){
    
    exports.song = mvvm.Model.extend({
       fields: {
           Title: String,
           Artist: String,
           Category: String,
           IsFavorite: Boolean
       },
       defaults: {
           IsFavorite: false
       }
    });
    
    exports.songCollection = mvvm.Collection.extend({
        model: exports.song
    });
    
    exports.playlist = mvvm.Model.extend({
        fields: {
            Name: String,
            Songs: exports.songCollection
        }
    });
    
    exports.data = {
        Name: "Party Pre-Game",
        Songs: [
            {
                Title: "Let's Get It Started",
                Artist: 'The Black Eyed Peas',
                Category: 'R&B Hip Hop',
                IsFavorite: true
            },
            {
                Title: 'Gold Digger',
                Artist: 'Kanye West feat. Jaime Foxx',
                Category: 'R&B Hip Hop',
                IsFavorite: false
            },
            {
                Title: "Shippin' Up To Boston",
                Artist: 'Dropkick Murphys',
                Category: 'Celtic',
                IsFavorite: true
            },
            {
                Title: 'Daylight',
                Artist: 'Matt & Kim',
                Category: 'Electronica',
                IsFavorite: false
            },
            {
                Title: "Free Bird",
                Artist: 'Lynyrd Skynyrd',
                Category: 'Rock',
                IsFavorite: true
            },
            {
                Title: "Sweet Home Alabama",
                Artist: 'Lynyrd Skynyrd',
                Category: 'Rock',
                IsFavorite: true
            },
            {
                Title: "Simple Man",
                Artist: 'Lynyrd Skynyrd',
                Category: 'Rock',
                IsFavorite: true
            },
            {
                Title: "That song where she's naked the whole video",
                Artist: 'Miley Cyrus',
                Category: 'Softcore?',
                IsFavorite: false
            }
            
        ]
    };
    
    exports.partyPregame = new exports.playlist(exports.data);
    return exports;
}));


