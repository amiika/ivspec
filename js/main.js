// Angularjs SparqlService testing

var app = angular.module('myApp', ['filters','services','editable']);
/*, function($routeProvider, $locationProvider) {
    $routeProvider.when('/', {controller:MainCtrl, templateUrl:'tmp/endpoint.html'}).otherwise({redirectTo:'/'});
  });*/
  
app.config(['$httpProvider', function($httpProvider) {
    delete $httpProvider.defaults.headers.common["X-Requested-With"]
}]);

