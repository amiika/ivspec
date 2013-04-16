function MainCtrl($scope, $location, SparqlService, PrefixService) {
    $scope.title = "SPARQL-endpoint documentation generator 0.1";
    $scope.validEndpoint = false;
    $scope.endpoint = "http://data.aalto.fi/sparql";
    $scope.classes = null;
    $scope.selectedGraph = "default";
    $scope.graphs = ["default"];
    $scope.properties = {};
    $scope.namespaces = {};
    $scope.date = new Date();
    $scope.ready = false;
    $scope.b64 = null;
    
    $scope.$watch('ready',function(){
     if($scope.ready) {
           var body = document.getElementsByTagName('body')[0];
           $scope.b64 = "data:text/html;charset=utf-8;base64,"+window.btoa(angular.element(body).html());
     }
    });
    
    
    // Test if endpoint is valid
    $scope.$watch('endpoint',function(e) {    
        SparqlService.query(e,"SELECT ?s WHERE { ?s ?p ?o . } LIMIT 1")
         .success(function(data) {
            $scope.validEndpoint = true;
         })
         .error(function(data, status, headers, config) {
             $scope.validEndpoint = false;
         });
    }); 
    
    // If endpoint or graph is changed and endpoint is valid
    $scope.$watch('endpoint+selectedGraph+validEndpoint',function(){
        if($scope.validEndpoint) {
            $scope.b64 = null;
            $scope.ready = false;
            initialize();
        }
    });
    
    function initialize() {
        
        if($scope.graphs.length<=1 && $scope.selectedGraph=="default") {
        SparqlService.query($scope.endpoint,"SELECT DISTINCT ?g WHERE { GRAPH ?g {?s ?p ?o } }")
         .success(function(data) {
             if(data.results.bindings.length>=1 && data.results.bindings[0].g!==undefined) {
                 data = data.results.bindings;
                 for(item in data) {
                    $scope.graphs.push(data[item].g.value);
                 }
             }
         });
        }
        
        SparqlService.query($scope.endpoint,"SELECT ?c WHERE {"+($scope.selectedGraph != "default" ? (" GRAPH <"+$scope.selectedGraph+"> { "):"")+" ?s a ?c FILTER(!STRSTARTS(STR(?c),'http://www.w3.org/1999/02/22-rdf-syntax-ns#')) "+($scope.selectedGraph != "default" ? (" } "):"")+"} GROUP BY ?c ORDER BY ?c")
         .success(function(data) {
            data = data.results.bindings;
            var p = []; 
            for(i = 0; i < data.length; ++i) {
                var resolved = PrefixService.resolve(data[i].c.value);
                if(resolved!=null) {
                    if($scope.namespaces[resolved.namespace]===undefined) $scope.namespaces[resolved.namespace] = resolved.prefix;
                    data[i].c.resolved = resolved;
                } else {
                    console.log("removed item "+i)
                    data.splice(i--,1);
                }
            }
            $scope.classes=data;
            var c = 0;
            
            function props(c) {
                 SparqlService.query($scope.endpoint,"SELECT ?p WHERE {"+($scope.selectedGraph != "default" ? (" GRAPH <"+$scope.selectedGraph+"> { "):"")+" ?s a <"+$scope.classes[c].c.value+"> . ?s ?p ?o FILTER(!STRSTARTS(STR(?p),'http://www.w3.org/1999/02/22-rdf-syntax-ns#')) "+($scope.selectedGraph != "default" ? (" } "):"")+"} GROUP BY ?p ORDER BY ?p")
                 .success(function(data) {
                    if(data.results.bindings.length>=1 && data.results.bindings[0].p!==undefined) {
                        var classNamespaces = {};
                        classNamespaces[$scope.classes[c].c.resolved.namespace] = $scope.classes[c].c.resolved.prefix;
                        data = data.results.bindings;
                        var prefixList = "";
                        var exampleStart = "SELECT";
                        var example = " WHERE { \n?s a "+$scope.classes[c].c.resolved.prefixed+" .";
                        for(item in data) {
                           var resolved = PrefixService.resolve(data[item].p.value);
                           data[item].p.resolved = resolved;
                           if(classNamespaces[resolved.namespace]===undefined) classNamespaces[resolved.namespace] = resolved.prefix;
                           if($scope.properties[data[item].p.value]===undefined) $scope.properties[data[item].p.value] = resolved;
                           exampleStart+=" ?"+data[item].p.resolved.localName
                           example+="\n?s "+resolved.prefixed+" ?"+resolved.localName+" .";
                        }
                        for(prefix in classNamespaces) prefixList+="PREFIX "+classNamespaces[prefix]+": "+"<"+prefix+">\n"
                        example+="\n} LIMIT 1";
                        $scope.classes[c].c.properties=data;
                        $scope.classes[c].c.example=prefixList+exampleStart+example;
                        }
                         c+=1;
                         if(c<$scope.classes.length) {
                             props(c);
                         } else { $scope.ready = true; }
                    
                 });
                
            }
            
            props(c);
                
            
            });
    }
    
}