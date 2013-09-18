var XUtil = XUtil || {};

(function ($, _, $x, global) {
    'use strict';

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
        if(XUtil.__$x){
            window.$x = XUtil.__$x;
        }else{
            delete window.$x;
        }
    }

} (jQuery, _, XUtil, this));

if(typeof($x) !== 'undefined'){ XUtil.__$x = $x;}
$x=XUtil;
