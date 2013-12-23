(function($, global){
    var mvvm = XMVVM;
    var xtest = global.XTest = {};
    var song = xtest.song = mvvm.Model.extend({
        fields: {
            Artist: String,
            Title: String
        },

        initialize: function () {
            this.Play = _.bind(this.Play, this);
        },

        Play: function () {
            console.log('Playing song ' + this.Title());
        }
    });

    var songCollection = xtest.songCollection = mvvm.Collection.extend({
        model: song
    });

    var album = xtest.album = mvvm.Model.extend({
        fields: {
            Title: String,
            Artist: String,
            Slug: String,
            Year: Number,
            Songs: songCollection,
            IsFavorite: Boolean
        }
    });

    var albumCollection = xtest.albumCollection = mvvm.Collection.extend({
        model: album
    });

    var musicCollection = xtest.musicCollection = mvvm.Model.extend({
        fields: {
            Title: { type: String },
            Albums: { type: albumCollection },
            TestNum: { type: Number },
        },

        getTime: function(){
            return new Date().toString();
        }
    });
    
    var person = xtest.person = mvvm.Model.extend({
        fields: {
            Name: String,
            Title: String
        }
    });
    
    var personCollection = xtest.personCollection = mvvm.Collection.extend({
        model: person
    });
    
    var organization = xtest.organization = mvvm.Model.extend({
       fields: {
           Name: String,
           Boss: person,
           Peons: personCollection
       }
    });
    
    var orgCollection = xtest.orgCollection = mvvm.Collection.extend({
        model: organization
    });
    
    //Have to create this property after orgCollection has been defined
    mvvm.Model.createField(organization.prototype, 'ChildOrgs', orgCollection);
}(jQuery, this))