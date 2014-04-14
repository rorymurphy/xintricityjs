/*
Copyright (c) 2013, Rory Murphy
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of the Rory Murphy nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define('xutil', ['underscore'], function (_) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.XUtil = factory(_, root));
        });
    } else {
        // Browser globals
        root.$x = root.XUtil = factory(root._, root);
    }
}(this, function (_, root) {
    'use strict';
    //var root = this; //TODO: figure out a proper method to access the global root object inside this context
    
    var __$xOld;
    if(typeof(root.$x) !== 'undefined'){ __$xOld = root.$x; }
    var $x = root.$x = {};
    
    $x.noConflict = function(){
        if(__$xOld){
            root.$x = __$xOld;
        }else{
            delete root.$x;
        }
    }
    
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
            var hasGetterSetter = typeof {}.__lookupGetter__ !== 'undefined';
            for (var i in source) {
                var g,s;
                if(hasGetterSetter){
                    g = source.__lookupGetter__(i);
                    s = source.__lookupSetter__(i);
                }
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

    
    //Define our own extend method that uses the enhanced extend with
    //getter and setter support
    $x.extendClass = function(protoProps, staticProps) {
        var parent = this;
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.
        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function() {
                return parent.apply(this, arguments);
            };
        }

        // Add static properties to the constructor function, if supplied.
        $x.extend(child, parent, staticProps);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        var Surrogate = function() {
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps)
            $x.extend(child.prototype, protoProps);

        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.__super__ = parent.prototype;

        return child;
    };
    
    return $x;

}));


