function MainCtrl($scope, $location, SparqlService, PrefixService,VocabService) {
    $scope.title = "SPARQL-endpoint documentation generator 0.1";
    $scope.validEndpoint = true;
    $scope.querying = false;
    $scope.endpoint = "http://sparql.onki.fi/loa/sparql";
    $scope.log = true;
    $scope.classes = null;
    $scope.selectedGraph = "default";
    $scope.graphs = ["default"];
    $scope.properties = undefined;
    $scope.objectProperties = {};
    $scope.namespaces = {};
    $scope.prefixList = "";
    $scope.date = new Date();
    $scope.generating = false;
    $scope.ready = false;
    $scope.b64 = null;
    $scope.ajaxes = {sent:0,resp:0};
    
    $scope.issues = {};
    $scope.assesment = {C:0,N:0,I:0,Pu:0,P:0,UI:0,UC:0,UP:0,UPu:0,UN:0,metrics:[]};
    
    $scope.generate = function() {
    	if($scope.validEndpoint) {
    	$scope.generating = true;	
	   	$scope.classes = null;
	    //$scope.selectedGraph = "default";
	    // fixme: query graphs before
	    //$scope.graphs = ["default"];
	    $scope.properties = {};
	    $scope.namespaces = {};
	    $scope.prefixList = "";
	    $scope.ready = false;
	    $scope.b64 = null;
	    $scope.issues = {};
    	
    	function getClasses(graph) {
    		return "SELECT ?c (count(?s) as ?count) WHERE {"+
    		(graph != "default" ? " GRAPH <"+graph+"> { " : "")+
    		" ?s a ?c FILTER(!STRSTARTS(STR(?c),'http://www.w3.org/1999/02/22-rdf-syntax-ns#')) "+
    		(graph != "default" ? " } " : "")+
    		"} GROUP BY ?c ORDER BY ?c"
    	}
        
        //SparqlService.query($scope.endpoint,"SELECT ?c WHERE {"+($scope.selectedGraph != "default" ? (" GRAPH <"+$scope.selectedGraph+"> { "):"")+" ?s a ?c FILTER(!STRSTARTS(STR(?c),'http://www.w3.org/1999/02/22-rdf-syntax-ns#')) "+($scope.selectedGraph != "default" ? (" } "):"")+"} GROUP BY ?c ORDER BY ?c")
         SparqlService.query($scope.endpoint,getClasses($scope.selectedGraph))
         .success(function(data) {
            data = data.results.bindings;
            var classesInUse = [];
            var p = []; 
            for(i = 0; i < data.length; i++) {
                var resolved = PrefixService.resolve(data[i].c.value);
                resolved.count = parseInt(data[i].count.value);
                $scope.assesment.I+=parseInt(data[i].count.value);
                
                if(resolved!=null) {
                	
                    if($scope.namespaces[resolved.namespace]===undefined) {
						
                    	// Lets assume unresolved
                    	var nspace = ""+resolved.namespace;
                    	$scope.namespaces[resolved.namespace] = {usage:1,id:nspace,prefix:resolved.prefix,referable:false,classes:[resolved]};
                    	// Transforms string to object created before !!!
                    	resolved.namespace = $scope.namespaces[nspace];
                    	resolveNamespace(resolved,true)
                    	
                    } else {
                    	$scope.namespaces[""+resolved.namespace].classes.push(resolved);
                    	$scope.namespaces[""+resolved.namespace].usage+=1;
                    	}
                    
                    classesInUse.push(resolved);
                    //data[i].c.resolved = resolved;
                    
                } else {
                	$scope.assesment.UC+=parseInt(res.count);
                	$scope.issues["ISSUE_"+data[i].c.value] = "Endpoint uses "+data[i].c.value+" as a Class!";
                    console.log("ISSUE: Removed item "+data[i].c.value)
                    data.splice(i--,1);               
                }
                // getDefinitions(resolved);
            }
            
            $scope.classes=classesInUse;
            var c = 0;
            var op = 0;
            
            // SELECT ?p (count(?p) as ?c) WHERE { ?s a <"+d.id+"> . ?s ?p ?o FILTER isLiteral(?o) } GROUP BY ?p
            // SELECT ?p ?oc (count(?p) as ?c) WHERE { ?s a <"+d.id+"> . ?s ?p ?o . ?o a ?oc FILTER(!REGEX(STR(?p), 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')) FILTER(!REGEX(STR(?p), 'http://www.w3.org/2000/01/rdf-schema#')) FILTER(!REGEX(STR(?p), 'http://www.w3.org/2002/07/owl#')) } GROUP BY ?p ?oc
            /*
             function getDatatypeProperties(graph,ctype) { 
            	return "SELECT ?p WHERE {"+
            	(graph != "default" ? (" GRAPH <"+graph+"> { "):"")+
            	"?s a <"+ctype+"> . ?s ?p ?o FILTER isLiteral(?o) FILTER(!STRSTARTS(STR(?p),'http://www.w3.org/1999/02/22-rdf-syntax-ns#')) "+
            	(graph != "default" ? (" } "):"")+
            	"} GROUP BY ?p ORDER BY ?p" 
            	}
            	
             function getObjectProperties(graph,ctype) { 
            	return "SELECT ?p WHERE {"+
            	(graph != "default" ? (" GRAPH <"+graph+"> { "):"")+
            	"?s a <"+ctype+"> . ?s ?p ?o . ?o a ?oc FILTER(!REGEX(STR(?p), 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')) "+
            	(graph != "default" ? (" } "):"")+
            	"} GROUP BY ?p ORDER BY ?p" 
            } */
             
            

            // Returns first object that is matching given id
            function getObjectById(arr,id) {
            	for(bs in arr) 
            		if(arr[bs].id==id) 
            			return arr[bs];
            	return undefined; 
            }
            
           
              function getProperties(graph,ctype) { 
            	return "SELECT DISTINCT ?p (count(?p) as ?count) ?type WHERE {"+
            	(graph != "default" ? (" GRAPH <"+graph+"> { "):"")+
            	" ?s a <"+ctype+"> . ?s ?p ?o . OPTIONAL { ?o a ?type } . FILTER(!STRSTARTS(STR(?p),'http://www.w3.org/1999/02/22-rdf-syntax-ns#')) "+
            	(graph != "default" ? (" } "):"")+
            	"} GROUP BY ?p ?type ORDER BY ?p" 
            	}
            
            function props(c) {
            	$scope.ready = false;
            	
            	console.log("Querying properties for "+(c+1)+"st class ...");
            	//console.log(getProperties($scope.selectedGraph,$scope.classes[c].c.value));
            	//SparqlService.query($scope.endpoint,"SELECT ?p WHERE {"+($scope.selectedGraph != "default" ? (" GRAPH <"+$scope.selectedGraph+"> { "):"")+" ?s a <"+$scope.classes[c].c.value+"> . ?s ?p ?o FILTER(!STRSTARTS(STR(?p),'http://www.w3.org/1999/02/22-rdf-syntax-ns#')) "+($scope.selectedGraph != "default" ? (" } "):"")+"} GROUP BY ?p ORDER BY ?p")
                 
                 aSend();
                 SparqlService.query($scope.endpoint,getProperties($scope.selectedGraph,$scope.classes[c].id))
                 .success(function(data) {
                    if(data.results.bindings.length>=1 && data.results.bindings[0].p!==undefined) {
                    	var classProperties = {};
                        var classNamespaces = {};
                        classNamespaces[$scope.classes[c].namespace.id] = $scope.classes[c].prefix;
                        data = data.results.bindings;
                        var prefixList = "";
                        var exampleStart = "SELECT";
                        var example = " WHERE { \n?s a "+$scope.classes[c].prefixed+" .";
                        
                        for(item in data) {
                        	resolved = undefined;
                          
                           if(classProperties[data[item].p.value]===undefined) {
 							   // If this is the first time in this class                          	
                           	   resolved = PrefixService.resolve(data[item].p.value);
                           	   
	                           if(classNamespaces[""+resolved.namespace]===undefined) classNamespaces[""+resolved.namespace] = resolved.prefix;

	                           if($scope.properties[data[item].p.value]===undefined) {
	                           	    // If this is the first time seen this property create new
	                           	    $scope.assesment.P+=1;
	                           	    resolved.count = parseInt(data[item].count.value);
		                           	$scope.properties[data[item].p.value] = resolved;
		                           	$scope.properties[data[item].p.value].classes=[$scope.classes[c]];
	                           } 
	                           else {
	                           		// Otherwise just add this class to the propertys class list
	                           		$scope.properties[data[item].p.value].count+=parseInt(data[item].count.value);
	                           		$scope.properties[data[item].p.value].classes.push($scope.classes[c]);
	                           }
	                           
	                           classProperties[data[item].p.value] = {count:parseInt(data[item].count.value),property:$scope.properties[data[item].p.value]};
	                           exampleStart+=" ?"+resolved.localName
	                           example+="\n?s "+resolved.prefixed+" ?"+resolved.localName+" .";
	                           $scope.assesment.Pu+=parseInt(data[item].count.value);
                          } else { 
                          		// Otherwise use the preloaded one
                          		//resolved = classProperties[data[item].p.value].property;
                          		resolved = $scope.properties[data[item].p.value]; 
                          }
                          		
                          // If property references other object push this to list
	                      if(data[item].type!==undefined) {
	                      	if(resolved.objectProperty===undefined) resolved.objectProperty = [];
			                  var object = getObjectById($scope.classes,data[item].type.value);
	                          if(object!==undefined) resolved.objectProperty.push({s:$scope.classes[c],p:object}); 
	                          else { 
	                          	$scope.issues["ISSUE_"+data[item].type.value] = "Class "+data[item].type.value+" referenced, but not found!";
	                          	console.log("ISSUE: Unknown error!"); 
	                         }
	                       }

                          
                        }                
                        
                        // Loop used prefixes to example
                        for(prefix in classNamespaces) {
                        	prefixList+="PREFIX "+classNamespaces[prefix]+": "+"<"+prefix+">\n"
                        }
                        
                        example+="\n} LIMIT 1";
                        // Sort class properties
                        classProperties = _.sortBy(classProperties,function(o){return o.count}).reverse();
                        $scope.classes[c].properties=classProperties;
                       // $scope.classes[c].min=_.min(classProperties,function(o){return o.count});
                        $scope.classes[c].example=prefixList+exampleStart+example;
                        
                        }
                        
                        // Continue recursive looping
                        
                         c+=1;
                         
                         if(c<$scope.classes.length) {
                             props(c);
                         } else {
                         	

                         	
                         	// Order properties by total count
                         	$scope.properties = _.sortBy($scope.properties,function(o){return o.count}).reverse();
                         	
                         	

                         	
                         	 // Loop properties after everyting else is ready
                         	 for(property = 0; property < $scope.properties.length; property++) {
	                         //for(property in $scope.properties) {
	                         	var currentProperty = $scope.properties[property];
	                         	
	                         	if($scope.namespaces[currentProperty.namespace]===undefined) {
	                    			// Lets assume unresolved namespaces
	                    			$scope.namespaces[currentProperty.namespace] = {usage:1,id:currentProperty.namespace,prefix:currentProperty.prefix,referable:false,properties:{}};
	                 				$scope.namespaces[currentProperty.namespace].properties[currentProperty.id] = currentProperty;
	                 				currentProperty.namespace = $scope.namespaces[currentProperty.namespace];
	                 				// Try to resolve namespace
	                 				console.log("Resolving namespace: "+currentProperty.namespace.id)
	                    			resolveNamespace(currentProperty,false);
                    			} else {
                    				currentProperty.namespace = $scope.namespaces[currentProperty.namespace];
	                    			$scope.namespaces[currentProperty.namespace.id].usage+=1;
	                    			if($scope.namespaces[currentProperty.namespace.id].properties===undefined) $scope.namespaces[currentProperty.namespace.id].properties = {};
	                    			$scope.namespaces[currentProperty.namespace.id].properties[currentProperty.id] = currentProperty;

                    			}
	                         	
	                         	console.log("Getting definitions for: "+currentProperty.id)
	                        	getDefinitions(currentProperty);
						
	                        	}
	                        	
	                        	$scope.ready = true;
                         		$scope.generating = false;
                         		
                         		// Everything should be ready, except asynchronous namespace resolving ...
                         		$scope.assesment.C=$scope.classes.length;
                         		
                         	
                         	}
                 aResp();   
                 });
                
            }
            
            props(c);
                
            
            });
            
     }       
    }
   
    $scope.$watch('ready',function(){
     if($scope.ready) {
           var body = document.getElementsByTagName('body')[0];
           $scope.b64 = "data:text/html;charset=utf-8;base64,"+window.btoa(angular.element(body).html());
     }
    });
    
    // Test if endpoint is valid
    $scope.$watch('endpoint',function(e) {
    	$scope.querying = true; 
        SparqlService.query(e,"SELECT ?s WHERE { ?s ?p ?o . } LIMIT 1")
         .success(function(data) {
         	$scope.querying = false;
         	$scope.validEndpoint = true;
            getGraphs();
         })
         .error(function(data, status, headers, config) {
         	 $scope.querying = false;
             $scope.validEndpoint = false;
         });
    }); 
    
    // If endpoint or graph is changed and endpoint is valid
    $scope.$watch('endpoint+selectedGraph+validEndpoint',function(){
        if($scope.validEndpoint) {
            $scope.b64 = null;
            $scope.ready = false;
            //initialize();
        }
    });
    
    $scope.$watch('ajaxes.resp',function(){
    	console.log($scope.ajaxes);
    	if($scope.ajaxes.sent>0 && $scope.ajaxes.sent-$scope.ajaxes.resp==0 && $scope.ready) {
    		console.log("Finalizing ...")
    		finalize();
    	}
    });
    
     function logAll() {
            	if($scope.log) {
            		console.log("Classes:");
            		console.log($scope.classes);
            		console.log("-----------------");
            		console.log("Properties:");
            		console.log($scope.properties);
            		console.log("-----------------");
            		console.log("Namespaces:")
            		console.log($scope.namespaces);
            		console.log("-----------------");
            		console.log("Issues:");
            		console.log($scope.issues);
            		console.log("-----------------");
            		console.log("Assesment:");
					console.log($scope.assesment);
            		
            	}
            }
    
    function finalize() {
    	// Order properties in namespaces by total count


       for(n in $scope.namespaces) {
       	$scope.assesment.N+=1;
       		if(!$scope.namespaces[n].referable) {
       			$scope.assesment.UN+=1;
       			for(pun in $scope.namespaces[n].properties) {
       				var unresolvedProperty = $scope.namespaces[n].properties[pun];
       				$scope.assesment.UP+=1;
         			$scope.assesment.UPu+=parseInt(unresolvedProperty.count);
         			getEndpointDefinitions(unresolvedProperty)
       			}
       			for(un in $scope.namespaces[n].classes) {
         			var unresolvedClass = $scope.namespaces[n].classes[un];
         			$scope.assesment.UC+=1;
         			$scope.assesment.UI+=parseInt(unresolvedClass.count);
         				}
         		}
		}
		
		angular.forEach($scope.namespaces,function(o) {
    		if(o.properties!==undefined)
    			o.properties = _.sortBy(o.properties,function(o){return o.count}).reverse();
    	});
		
		$scope.namespaces = _.sortBy($scope.namespaces,function(o){return o.usage}).reverse();

  	 	logAll();
    }
    
    function aSend() {
    	$scope.ajaxes.sent+=1;
    }
    
    function aResp() {
    	$scope.ajaxes.resp+=1;
    }
    
    function resolveNamespace(res,isClass) {
    	aSend();

        var prefix = "PREFIX sd: <http://www.w3.org/ns/sparql-service-description#> PREFIX dc: <http://purl.org/dc/terms/>";
    	
    	VocabService.test(res.namespace.id,prefix+
    	//"PREFIX dc: <http://purl.org/dc/terms/> PREFIX dct: <http://purl.org/dc/elements/1.1/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX pdc: <http://purl.org/dc/terms/> PREFIX owl: <http://www.w3.org/2002/07/owl#>"+
    	//"SELECT ?title WHERE { {<"+res.namespace+"> ?p ?title } UNION { ?o a owl:Ontology . ?o ?p ?title }  FILTER(STRENDS(STR(?p), 'title')) }")
    	"SELECT ?valid WHERE { ?s dc:valid ?valid }")
         .success(function(data) {
         
           if(data.results.bindings.length>=1 && data.results.bindings[0].valid!==undefined) {
	           	data = data.results.bindings;
	            //$scope.namespaces[res.namespace.id].title = data[0].title.value;
	            if(data[0].valid.value === 'true') {
	            	$scope.namespaces[res.namespace.id].referable=true;
	            } else {
	            	console.log("ISSUE: Could not resolve: "+res.namespace.id);
	            	$scope.issues["ISSUE_"+res.namespace.id] = "Vocabulary uri "+res.namespace.id+" doesnt seem to be dereferenceable!";
	            }
	            //$scope.namespaces[res.namespace.id].modified=data[0].mod.value;
           } else {
           		$scope.issues["ISSUE_"+res.namespace.id] = "ISSUE: Generator issue? "+res.namespace.id+" doesnt seem to be dereferenceable!";
           		console.log("ERR "+res.namespace.id);
           }
           
           aResp();
         })
         .error(function(data) {
         	console.log("ISSUE: Invalid RDF from "+res.namespace.id);
         	$scope.issues["ISSUE_"+res.namespace.id] = "Invalid RDF from: "+res.namespace.id;
         	aResp();
         	});
    	
    }
    
    // Get definitions from the endpoint
    
	function getDefsQuery(id) {
    		return "SELECT ?p ?def WHERE {"+
    		" <"+id+"> ?p ?def . FILTER(isLiteral(?def)) "+
    		"} GROUP BY ?p ?def"
    }    
        
   function getEndpointDefinitions(res) {
      
         SparqlService.query($scope.endpoint,getDefsQuery(res.id))
         .success(function(data) {
         	if(data.results.bindings.length>=1 && data.results.bindings[0].p!==undefined) {
            	           console.log("FOUND SOME SHIT!");
           console.log(data);return data.results.bindings;
           }

         })
         .error(function() {});
      }
         
         
    // Get definitions from the vocabularies
    
    function getDefinitions(res) {
    	aSend();
    	$scope.querying = true; 
    /*	VocabService.test(res.namespace.id,
    	"PREFIX dc: <http://purl.org/dc/terms/> PREFIX dct: <http://purl.org/dc/elements/1.1/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX pdc: <http://purl.org/dc/terms/> PREFIX owl: <http://www.w3.org/2002/07/owl#>"+
    	"SELECT ?p WHERE { OPTIONAL { <"+res.id+"> ?p ?o } LIMIT 1")
         .success(function(data) {
			if(data.results.bindings.length>=1) {
			
			}
         }).error(function(data) {	
         	console.log(res.id+" doesnt exist!");
         });*/
    	
    	VocabService.test(res.namespace.id,
    	"PREFIX dc: <http://purl.org/dc/terms/> PREFIX dct: <http://purl.org/dc/elements/1.1/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX pdc: <http://purl.org/dc/terms/> PREFIX owl: <http://www.w3.org/2002/07/owl#>"+
    	"SELECT ?label ?comment ?range ?domain ?p WHERE { OPTIONAL { <"+res.id+"> rdfs:label ?label } OPTIONAL { <"+res.id+"> rdfs:comment ?comment } OPTIONAL { <"+res.id+"> rdfs:range ?range } OPTIONAL { <"+res.id+"> rdfs:domain ?domain } }")
         .success(function(data) {
           $scope.querying = false; 
           if(!_.isEmpty(data.results.bindings[0])) {
	           	data = data.results.bindings;
	            for(i in data) {
	            	
                if(data[i].label!==undefined) res.label = data[i].label.value
                if(data[i].comment!==undefined) res.comment = data[i].comment.value
                if(data[i].domain!==undefined) res.domain = data[i].domain.value
                if(data[i].range!==undefined) res.range = data[i].range.value
               
               }
           } else {
           	console.log(res.id+" couldnt find any definitions");
           }
           aResp();
         })
         .error(function(data) {
         	$scope.querying = false; 
         	console.log(res.id+" doesnt exist!");
         	aResp();
         	});
    	
    }
    
    function getGraphs() {
    $scope.selectedGraph = "default";
    $scope.graphs = ["default"];
    $scope.querying = true;
    	
    if($scope.graphs.length<=1 && $scope.selectedGraph=="default") {
        SparqlService.query($scope.endpoint,"SELECT DISTINCT ?g WHERE { GRAPH ?g {?s ?p ?o } }")
         .success(function(data) {
         	$scope.querying = false;
             if(data.results.bindings.length>=1 && data.results.bindings[0].g!==undefined) {
                 data = data.results.bindings;
                 for(item in data) {
                    $scope.graphs.push(data[item].g.value);
                 }
                 $scope.validEndpoint = true;
             }
         });
        }
    	
    }
    
    
}