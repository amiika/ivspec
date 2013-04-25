
var vis = angular.module('vis', ['filters','services','editable','angular-underscore']);

vis.config(['$httpProvider', function($httpProvider) {
    delete $httpProvider.defaults.headers.common["X-Requested-With"]
}]);


function visCtrl($scope, SparqlService, PrefixService,VocabService) {
	$scope.classes = undefined;
	$scope.propsFound = false;
	$scope.validEndpoint = true;
    $scope.querying = false;
    $scope.endpoint = "http://sparql.onki.fi/loa/sparql";
    $scope.selectedGraph = undefined;
    $scope.graphs = ["default"];
    $scope.props = undefined;
    $scope.selectedProp = undefined;
    $scope.filter = undefined;
    
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
    
    $scope.$watch('selectedGraph',function(e) {
    	if($scope.selectedGraph!==undefined)
    		getProps($scope.selectedGraph);
    });
    
    $scope.query = function() {
    	if($scope.selectedProp!==undefined) {
    		console.log($scope.filter);
    		console.log(isInt(parseInt($scope.filter)))
    		getClasses($scope.endpoint,$scope.selectedGraph,$scope.selectedProp,$scope.filter);
    	}
    }
    
    function proQry(graph) {
    		return "SELECT ?p WHERE {"+
    		(graph != "default" ? " GRAPH <"+graph+"> { " : "")+
    		" ?s ?p ?o . "+
    		(graph != "default" ? " } " : "")+
    		"} GROUP BY ?p ORDER BY ?p"
    }
    
    function isInt(n) {
   		return typeof n === 'number' && n % 1 == 0;
	}
	
	function classQry(graph,type,having) {
    		return "SELECT ?l ?c (count(?s) as ?count) WHERE {"+
    		(graph != "default" ? " GRAPH <"+graph+"> { " : "")+
    		" ?s <"+type+"> ?c . "+
    		(graph != "default" ? " } " : "")+
    		" OPTIONAL { ?c ?p ?l . FILTER(STRENDS(STR(?p),'label') || STRENDS(STR(?p),'title') || STRENDS(STR(?p),'name') ) }"+
    		"} GROUP BY ?c ?l "+
    		(isInt(parseInt(having))?"HAVING(?count > "+having+")":"");
    		
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
    
   function getProps(graph) {
    	$scope.propsFound=false;
        SparqlService.query($scope.endpoint,proQry(graph))
         .success(function(data) {
         	$scope.propsFound=true;
       		propsInUse = [];
			
                data = data.results.bindings;
                console.log(data);
                
                for(i = 0; i < data.length; i++) {
                var resolved = PrefixService.resolve(data[i].p.value);
                
                if(resolved!=null || propsInUse.some(function(o) { return o.id==resolved.id; })) {
                    propsInUse.push(resolved);
                } else {
                    data.splice(i--,1);               
                }
                
            }
        
             $scope.props=propsInUse;
         });
        
    }
    
function ValidUrl(str) {
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  if(!pattern.test(str)) {
    return false;
  } else {
    return true;
  }
}
    	
    function getClasses(endpoint,graph,type,filter) {
        
         SparqlService.query(endpoint,classQry(graph,type.id,filter))
         .success(function(data) {
            data = data.results.bindings;
            var namespaces = [];
            var classesInUse = [];
            var p = [];
            for(i = 0; i < data.length; i++) {
            	if(data[i].c["xml:lang"]==undefined || data[i].c["xml:lang"]=="fi") {
            	var resolved = {};
            	if(ValidUrl(data[i].c.value)) {
                var resolved = PrefixService.resolve(data[i].c.value);
                if(data[i].l!==undefined) resolved.label = data[i].l.value;
                
                console.log(resolved);
                if(resolved.namespace!==null) {
                if(namespaces.length==0) {
                	namespaces.push(resolved.namespace);
                	resolved.color=0;
                } else {
                	var news = true;
                	for(n in namespaces) { 
                		if(namespaces[n]==resolved.namespace) {
                			resolved.color=n;
                			news = false;
                		}
                	}
                	if(news) {
                		namespaces.push(resolved.namespace);
                		resolved.color=(namespaces.length-1);
                	}
                }
                } } else resolved.label=data[i].c.value;
                
                resolved.count = parseInt(data[i].count.value);
                resolved.r = Math.max(Math.log(data[i].count.value/((800/1200)*1))*20,40);
                
                if(resolved!=null) {
                    classesInUse.push(resolved);
                } else {
                    console.log("ISSUE: Removed item "+data[i].c.value)
                    data.splice(i--,1);               
                }
                
            }
            
            $scope.classes=classesInUse;
            }
            });
          }
}

vis.directive('ghVisualization', function () {

  // constants
  var margin = 20,
    width = 960,
    height = 500 - .5 - margin,
    color = d3.scale.ordinal()
    .domain(["6TH", "7TH", "5TH", "4TH"])
    .range(colorbrewer.RdBu[4]);
    //color = d3.interpolateRgb("#f77", "#77f");

  return {
    restrict: 'E',
    scope: {
      val: '=',
      grouped: '='
    },
    link: function (scope, element, attrs) {
    
	var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = 1200 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;
    	
    var svg = d3.select(element[0])
        .append("svg")
          .attr("width", width)
          .attr("height", height);
    	
    	scope.$watch('val',function(data) {
    		if(data!==undefined) {
    		console.log(data);
    		
    		svg.selectAll('*').remove();
    		
    		
			var n = 200,
			    m = 10,
			    padding = 6,
			    color = d3.scale.category10().domain(d3.range(m));
			
			var nodes = data;
			
			/*
			var nodes = d3.range(n).map(function() {
			  var i = Math.floor(Math.random() * m),
			      v = (i + 1) / m * -Math.log(Math.random());
			  return {
			    r: r(v),
			    color: color(i)
			  };
			});*/
			
			var force = d3.layout.force()
			    .nodes(nodes)
			    .size([width, height])
			    .gravity(0)
			    .charge(0)
			    .on("tick", tick)
			    .start();
			
			svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
			
			svg.selectAll("g .node").data(nodes);
			 
			var g = svg.selectAll("g .node")
					.data(nodes)
					.enter()
					.append("g")
			 		.attr("class", "node")
      				.call(force.drag);
			 			
			var circle = g.append("circle")
			    		.attr("r", function(d) { return d.r; })
			    		.style("fill", function(d) { return color(d.count); });
			    			
			g.append("text")
      		.attr("class","text")
      		.text(function(d) { return d.label!==undefined ? d.label : d.prefixed })
      		.style("font-size", function(d) { return 2*d.r / this.getComputedTextLength() * 9 + "px"; })
      		.attr("text-anchor", "middle")
      		.attr("dy", ".2em")
      		
      		g.append("text")
      		.attr("class","text")
      		.text(function(d) { return d.count })
      		.style("font-size", function(d) { return Math.max(d.r / this.getComputedTextLength() * 6 + "px",20); })
      		.attr("text-anchor", "bottom")
      		.attr("text-anchor", "middle")
      		.attr("dy", "1.3em");
      		 
      		 

      		 
			function tick(e) {
			  	g.each(cluster(10 * e.alpha * e.alpha))
			     .each(collide(.1))
			     .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
			      
			      //.attr("cx", function(d) { return d.x; })
			      //.attr("cy", function(d) { return d.y; });
			}
			
			// Move d to be adjacent to the cluster node.
			function cluster(alpha) {
			  var max = {};
			
			  // Find the largest node for each cluster.
			  nodes.forEach(function(d) {
			    if (!(d.color in max) || (d.r > max[d.color].r)) {
			      max[d.color] = d;
			    }
			  });
			
			  return function(d) {
			    var node = max[d.color],
			        l,
			        r,
			        x,
			        y,
			        k = 1,
			        i = -1;
			
			    // For cluster nodes, apply custom gravity.
			    if (node == d) {
			      node = {x: width / 2, y: height / 2, r: -d.r};
			      k = .1 * Math.sqrt(d.r);
			    }
			
			    x = d.x - node.x;
			    y = d.y - node.y;
			    l = Math.sqrt(x * x + y * y);
			    r = d.r + node.r;
			    if (l != r) {
			      l = (l - r) / l * alpha * k;
			      d.x -= x *= l;
			      d.y -= y *= l;
			      node.x += x;
			      node.y += y;
			    }
			  };
			}
			
			// Resolves collisions between d and all other circles.
			function collide(alpha) {
			  var quadtree = d3.geom.quadtree(nodes);
			  return function(d) {
			    var r = d.r + padding,
			        nx1 = d.x - r,
			        nx2 = d.x + r,
			        ny1 = d.y - r,
			        ny2 = d.y + r;
			    quadtree.visit(function(quad, x1, y1, x2, y2) {
			      if (quad.point && (quad.point !== d)) {
			        var x = d.x - quad.point.x,
			            y = d.y - quad.point.y,
			            l = Math.sqrt(x * x + y * y),
			            r = d.r + quad.point.r + (d.color !== quad.point.color) * padding;
			        if (l < r) {
			          l = (l - r) / l * alpha;
			          d.x -= x *= l;
			          d.y -= y *= l;
			          quad.point.x += x;
			          quad.point.y += y;
			        }
			      }
			      return x1 > nx2
			          || x2 < nx1
			          || y1 > ny2
			          || y2 < ny1;
			    });
			  };
			}
    		
    	}	
    		
    		
    	});
    		
    }
    }	
    });
