(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('XUtil', ['jQuery', '_'], function ($, _) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.XUtil = factory(b));
        });
    } else {
        // Browser globals
        root.$x = root.XUtil = factory(root.jQuery, root._);
    }
}(this, function ($, _) {
    'use strict';
    var root = window; //TODO: figure out a proper method to access the global root object inside this context
    
    var __$xOld;
    if(typeof($x) !== 'undefined'){ __$xOld = $x; }
    var $x = {};
    
    //Creates or retrieves the requested javascript namespace.
    $x.namespace = function (namespace) {
        var pieces = namespace.split('.');
        var nsIter;
        $.each(pieces, function (index, item) {
            if (index == 0) {
                nsIter = root;
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

    //Supplement the underscore.js extend with the getter/setter extend provide by
    //John Reisig at http://ejohn.org/blog/javascript-getters-and-setters/
    $x.extend = function(obj) {
        _.each(Array.prototype.slice.call(arguments, 1), function(source) {
          if (source) {
              
            for (var i in source) {
                var g = source.__lookupGetter__(i), s = source.__lookupSetter__(i);

                if ( g || s ) {
                    if ( g )
                        obj.__defineGetter__(i, g);
                    if ( s )
                        obj.__defineSetter__(i, s);
                 } else
                     obj[i] = source[i];
            }
          }
        });
        return obj;
    };
  
    $x.noConflict = function(){
        if(__$xOld){
            window.$x = __$xOld;
        }else{
            delete window.$x;
        }
    }
    
    return $x;

}));


