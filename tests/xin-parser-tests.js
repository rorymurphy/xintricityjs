(function ($) {
    var mvvm = XMVVM;

/*******************************************************************
First a few classes that will be used throughout the various tests
********************************************************************/
var song = XTest.song;
var songCollection = XTest.songCollection;
var album = XTest.album;
var albumCollection = XTest.albumCollection;
var musicCollection = XTest.musicCollection

var person = XTest.person;
var personCollection = XTest.personCollection;
var organization = XTest.organization;
var orgCollection = XTest.orgCollection;
/*******************************************************************
Let the tests begin
********************************************************************/
    var mvvm = XMVVM;
    test('Test CSS Trigger Parse', function(){
       var parser = new mvvm.templateParser();
       var $el = $('#xin-mvvm-css-trigger-test');
       var node = parser.parse($el);
       
       equal(node.childNodes.length, 2);
       equal(node.childNodes[0].type, mvvm.cssTriggerNodeType);
       deepEqual(node.childNodes[0].position, [1,1]);
       equal(node.childNodes[0].cssClass, 'test-class');
       
       equal(node.childNodes[1].type, mvvm.cssTriggerNodeType);
       deepEqual(node.childNodes[1].position, [1,1]);
       equal(Object.keys(node.childNodes[1].styles).length, 2);
       deepEqual(node.childNodes[1].styles, {display: 'none', color: 'black'});
    });
    test('Test Action Trigger Parse', function(){
       var parser = new mvvm.templateParser();
       var $el = $('#xin-mvvm-action-trigger-test');
       var node = parser.parse($el);
       
       equal(node.childNodes.length, 2);
       equal(node.childNodes[0].type, mvvm.actionTriggerNodeType);
       deepEqual(node.childNodes[0].position, [1,1]);
       ok(_.isObject(node.childNodes[0].action));
       
       equal(node.childNodes[1].type, mvvm.actionTriggerNodeType);
       deepEqual(node.childNodes[1].position, [1,1]);
       ok(_.isObject(node.childNodes[1].action));     
    });    
    test('Test Attribute Binding Parse', function(){
       var parser = new mvvm.templateParser();
       var $el = $('#xin-mvvm-attribute-binding-test');
       var node = parser.parse($el);
       
       equal(node.childNodes.length, 1);
       equal(node.childNodes[0].type, mvvm.attributeBindingNodeType);
       deepEqual(node.childNodes[0].position, [1,1]);
    });
    test('Test Text Binding Parse', function(){
       var parser = new mvvm.templateParser();
       var $el = $('#xin-mvvm-text-binding-test');
       var node = parser.parse($el);
       
       equal(node.childNodes.length, 1);
       equal(node.childNodes[0].type, mvvm.textBindingNodeType);
       deepEqual(node.childNodes[0].position, [1,1,0]);
       equal(node.childNodes[0].pattern, '{0} {1}');
       deepEqual(node.childNodes[0].paths, [new mvvm.BindingExpression({path: 'Model.FirstName'}), new mvvm.BindingExpression({path: 'Model.LastName'})]);
    });

    test('Select Binding Parse', function(){
       var parser = new mvvm.templateParser();
       var $el = $('#xin-mvvm-select-binding-test');
       var node = parser.parse($el);
       
       equal(node.childNodes.length, 1);
       equal(node.childNodes[0].type, mvvm.selectBindingNodeType);
       deepEqual(node.childNodes[0].position, [1,1]);
       equal(node.childNodes[0].textField, 'some-text-field');
       equal(node.childNodes[0].valueField, 'some-value-field');
    });
    
    test('If Block Parse', function(){
        var parser = new mvvm.templateParser();
       var $el = $('#xin-mvvm-if-block-test');
       var node = parser.parse($el);
       equal(node.childNodes.length, 1);
       equal(node.childNodes[0].type, mvvm.ifNodeType);
       equal(node.childNodes[0].branches.length, 2);
       notEqual(node.childNodes[0].defaultBranch, null);
       
       equal(node.childNodes[0].branches[0].childNodes.length, 1);
       equal(node.childNodes[0].branches[1].childNodes.length, 1);
       equal(node.childNodes[0].defaultBranch.childNodes.length, 1);
    });
    
    test('Foreach Block Parse', function(){
        var parser = new mvvm.templateParser();
       var $el = $('#xin-mvvm-foreach-block-test');
       var node = parser.parse($el);
       equal(node.childNodes.length, 1);
       equal(node.childNodes[0].type, mvvm.foreachNodeType);
       equal(node.childNodes[0].childNodes.length, 2);
    });    
} (jQuery));