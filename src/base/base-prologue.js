//This file is used to wrap the customized Backbone build

//(function(){

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('XBase', ['underscore', 'xutil', 'xmvvm'], function (_, $x, mvvm) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.__XBase__ = factory(root, _, $x, mvvm));
        });
    } else {
        // Browser globals
        root.__XBase__ = factory(root, root._, root.XUtil, root.XMVVM);
    }
}(this, function (root, _, $x) {