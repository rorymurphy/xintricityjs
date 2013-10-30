  // Set up inheritance for the model, collection, router, view and history.
  // RAM - Removed View.extend, as Xintricity does not have a View object
  Model.extend = Collection.extend = Router.extend = History.extend = extend;

//This file is used to wrap the customized Backbone build
}).call(this);


