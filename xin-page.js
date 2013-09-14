(function($x){
    var xns = $x.namespace('xintricity');
    
    var evtObj = {
        target: null,
        _isDefaultPrevented: false,
        preventDefault: function(){this._isDefaultPrevented=true;},
        isDefaultPrevented: function(){ return this._isDefaultPrevented; }
    };
    
    xns.page = {

        //Provides a mechanism for different views/models to signal that a page wide save should occur
        //For example, on a blog page that has editor boxes for categories, tags, and other metadata
        //when the main blog post is saved, it would use this to signal that others should save as well.
        save: function(){
            var t=this;
            var args = _.extend({target: t}, evtObj);
            t.trigger('saving', args);
            if(args.isDefaultPrevented){return;}

            args = _.extend({target: t}, evtObj);
            t.trigger('save', args);

            args = _.extend({target: t}, evtObj);
            t.trigger('saved', args);
        }
    };
    _.extend(xns.page, Backbone.Events);
    
    //These namespaces are used throughout Xintricity to provide a standard mechanism for locating the
    //(primarily Backbone) models, views, and routers that underpin each page.
    $x.namespace('xintricity.page.models');
    $x.namespace('xintricity.page.views');
    $x.namespace('xintricity.page.routers');
}(XUtil));