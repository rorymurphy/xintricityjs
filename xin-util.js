var $xintricity = $xintricity || {};

(function ($, _, $x, global) {
    'use strict';

    //Creates a fake form and submits it in order to generate a POST request rather than GET
    $x.pseudoForm = function (action, method, formFields) {
        var form = $('<form></form>').attr('action', action).attr('method', method);
        for (var key in formFields) {
            var val = formFields[key];
            var input = $('<input/>').attr('name', key).attr('type', 'hidden').val(val);
            form.append(input);
        }

        $('body').append(form);
        form.submit();
    };

    //Creates or retrieves the requested javascript namespace.
    $x.namespace = function (namespace) {
        var pieces = namespace.split('.');
        var nsIter;
        $.each(pieces, function (index, item) {
            if (index == 0) {
                nsIter = global;
            }
            if (!(item in nsIter)) {
                nsIter[item] = {};
            }
            nsIter = nsIter[item];
        });

        return nsIter;
    };

    //Provides string formatting using the "{0} is the first value in the array parameter" syntax
    $x.format = function(formatString){
        var args = arguments;
        formatString = formatString.replace(/\{(\d+)\}/ig, function(match, p1, offset, s){
            return args[parseInt(p1) + 1];
        });
        return formatString;
    };

    var slugifyRegex = new RegExp('/[^\w_]+/');
    //Converts a given string to a slug, as defined in Xintricity
    $x.slugify= function(value){
        return value.replace(slugifyRegex, '-').toLowerCase();
    };

    //Utility method to create an empty modal dialog
    $x.createModal = function(){
        return $('<div class="modal hide fade"><div class="modal-header"></div><div class="modal-body"></div><div class="modal-footer"></div></div>');
    };

    $x.noConflict = function(){
        if($xintricity.__$x){
            window.$x = $xintricity.__$x;
        }else{
            delete window.$x;
        }
    }

    var evtObj = {
        target: null,
        isDefaultPrevented: false,
        preventDefault: function(){this.isDefaultPrevented=true;}
    };

    $xintricity.page = {
        
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
    _.extend($xintricity.page, Backbone.Events);

    //These namespaces are used throughout Xintricity to provide a standard mechanism for locating the
    //(primarily Backbone) models, views, and routers that underpin each page.
    $x.namespace('$xintricity.page.models');
    $x.namespace('$xintricity.page.views');
    $x.namespace('$xintricity.page.routers');

} (jQuery, _, $xintricity, this));

if(typeof($x) !== 'undefined'){ $xintricity.__$x = $x;}
$x=$xintricity;
