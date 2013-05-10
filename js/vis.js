
var vis = angular.module('vis', ['filters','services','editable','angular-underscore']);

vis.config(['$httpProvider', function($httpProvider) {
    delete $httpProvider.defaults.headers.common["X-Requested-With"]
}]);


function visCtrl($scope, SparqlService, PrefixService,VocabService) {
	$scope.show = true;
	$scope.classes = undefined;
	$scope.propsFound = false;
	$scope.validEndpoint = true;
    $scope.querying = false;
    $scope.endpoint = "http://localhost:3030/ik/sparql";
    $scope.selectedGraph = undefined;
    $scope.graphs = ["default"];
    $scope.props = undefined;
    $scope.selectedProp = undefined;
    $scope.filter = undefined;
    $scope.status = "";
    
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
    		" OPTIONAL { ?s ?p ?l . ?s <"+type+"> ?c .  FILTER(isNumeric(?c) && (STRENDS(STR(?p),'label') || STRENDS(STR(?p),'title') || STRENDS(STR(?p),'name')) ) }"+
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
    	$scope.querying = true; 
        SparqlService.query($scope.endpoint,proQry(graph))
         .success(function(data) {
         	$scope.querying = false; 
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
        $scope.querying = true; 
         SparqlService.query(endpoint,classQry(graph,type.id,filter))
         .success(function(data) {
         	$scope.querying = false; 
            data = data.results.bindings;
            var namespaces = [];
            var classesInUse = [];
            var p = [];
            for(i = 0; i < data.length; i++) {
            	
            	// Exclude other languages
            	if(data[i].c["xml:lang"]==undefined || data[i].c["xml:lang"]=="fi") {
            		
            	var resolved = {};
            	
            	// C is a class
            	if(ValidUrl(data[i].c.value)) {
            	console.log(data[i].c.value+" IS a Class")
                var resolved = PrefixService.resolve(data[i].c.value);
                if(data[i].l!==undefined) resolved.label = data[i].l.value;
                
                console.log("Resolved class:")
                console.log(resolved);
                if(resolved.namespace!==null) {
                if(namespaces.length==0) {
                	namespaces.push(resolved.namespace);
                } else {
                	var news = true;
                	for(n in namespaces) { 
                		if(namespaces[n]==resolved.namespace) {
                			news = false;
                		}
                	}
                	if(news) {
                		namespaces.push(resolved.namespace);
                	}
                } }
                
                // Count is number of class instances
                resolved.count = parseInt(data[i].count.value);
                
                } 
                else {
                	console.log(data[i].c.value+" IS Literal")
                	// C is not a class. Use c as a label
                	resolved.label=data[i].c.value;
                	if(!isNaN(resolved.label)) {
                		// Count is the numeric value
                		resolved.count=resolved.label;
                		if(data[i].l!==undefined) resolved.label = data[i].l.value;
                	} else {
                		// Count is the number of instances
                		resolved.count = parseInt(data[i].count.value);
                	}
                }
                
               // resolved.r = Math.max(Math.log(data[i].count.value/((800/1200)*3))*15,40);
                
                if(resolved!=null) {
                    classesInUse.push(resolved);
                } else {
                    console.log("ISSUE: Removed item "+data[i].c.value)
                    data.splice(i--,1);               
                }
                
            
            
            $scope.classes=classesInUse;
            } 
            
           }
            });
          }
}

vis.directive('ghVisualization', function () {

  // constants
  var margin = 20,
    width = 960,
    height = 500 - .5 - margin;

    //color = d3.interpolateRgb("#f77", "#77f");

  return {
    restrict: 'E',
    scope: {
      val: '=',
      loading: '=',
      grouped: '='
    },
    link: function (scope, element, attrs) {
    
	var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = 1200 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;
    	
    var svg = d3.select(element[0])
        .append("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("pointer-events", "all")
  		  .append('g')
          .call(d3.behavior.zoom().on("zoom", redraw))
          .append('g');
          
			var rect = svg.append('rect')
	    		.attr('width', width*50)
			    .attr('x',-width/2*50)
	    		.attr('y',-height/2*50)
	    		.attr('height', height*50)
	    		.attr('fill', 'white');
    
		function redraw() {
		  svg.attr("transform",
		      "translate(" + d3.event.translate + ")"
		      + " scale(" + d3.event.scale + ")");
		}
    	
    	scope.$watch('loading',function(load) {
    		
    		if(load) {
    		svg.selectAll('.node').remove();
    		
			var lineTotal = 6,
			  lineLength = 40,
			  speed = 1,
			  width = 50,
			  radius = 40,
			  color = '#333',
			
			  posX = width*10,
			  posY = height/2,
			  rotIncrement = Math.floor(360/lineTotal),
			  group,
			  lines;
			 
			function data() {
			  return new Array(lineTotal);
			}
			 
			group = svg.append('g')
			.attr('class',"node")
				.attr('transform', 'translate(' + [posX, posY] + ')');
			
			lines = group.selectAll('line')
			.data(data)
			.enter()
			.append('line')
			  .attr({
			    'fill': 'none',
			    'stroke-linecap': 'round',
			    'stroke-width': width,
			    'x1': radius,
			    'y1': radius,
			    'x2': lineLength,
			    'y2': lineLength,
			    'stroke': color,
			    'transform': function (d,i) {
			      return 'rotate(' + (i + 1) * rotIncrement + ')';
			    }
			  })
			.append('animate')
			  .attr({    
			    'attributeName': 'opacity',
			    'repeatCount': 'indefinite',
			    'attributeType': 'CSS',
			    'from': 1,
			    'to': 0.3,
			    'dur': speed + 's',
			    'begin': function (d,i) {
			      return 16/150 * (i + 1) + 's';
			    }
			  });
    		} else {
    			svg.selectAll('.node').remove();
    		}
    		
    	});
    	
    	scope.$watch('val',function(data) {
    		if(data!==undefined) {
    			
    			
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
			    if (!(color(d.count) in max) || (d.r > max[color(d.count)].r)) {
			      max[color(d.count)] = d;
			    }
			  });
			
			  return function(d) {
			    var node = max[color(d.count)],
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
			            r = d.r + quad.point.r + (color(d.count) !== color(quad.point.count)) * padding;
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
    			
    	    console.log("Visualized data:");
    		console.log(data);
    		
    		var min = d3.min(_.map(data, function(d) { return parseInt(d.count); }))
    		var max = d3.max(_.map(data, function(d) { return parseInt(d.count); }))
    		var median = d3.median(_.map(data, function(d) { return d.count; }))
    		var mean = d3.mean(_.map(data, function(d) { return d.count; }))
    		
    		console.log("Min: "+min );
    		console.log("Max: "+max );	
    		console.log("Median: "+median );
    		console.log("Mean: "+mean );
    		
    		 var qua = d3.scale.quantize()
    			.domain([min,max])
    			.range([40, 60, 80, 90, 100]);
    		
    		if(Math.abs(median-mean)>10) {
    			//console.log("Logarithmic scale");
    			 //for(d in data) {
    			 //	data[d].r = Math.max(Math.log(data[d].count/((800/1200)*3))*15,40);
    			 //}
    			  console.log("Quantized scale 1-5");
    			  for(d in data) {
    			   data[d].r = qua(data[d].count);
    			   }
    			}
    		else {
    			console.log("Quantized scale 1-5");
    			  for(d in data) {
    			   data[d].r = qua(data[d].count);
    			   }
    			}
    		
    		
    		
    		svg.selectAll('.node').remove();
    		
    		
			var n = 200,
			    m = 10,
			    padding = 6;
			    //color = d3.scale.ordinal()
    			//.domain(["6TH", "7TH", "5TH", "4TH"])
    			//.range(colorbrewer.RdBu[4]);

      				
      			//var color = d3.scale.linear()
    			//.domain([0, d3.max(_.map(data, function(d) { return d.count; }))])
    			//.range(["blue", "green"]);
    			

    			

    			
    			var color = d3.scale.quantize()
    			.domain([0,d3.max(_.map(data, function(d) { return d.count; }))])
    			.range(["#FFA300", "#FF661A", "#75BA23","#7E69AA","#009577" ]);


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
      		 

    		
    	}	
    		
    		
    	});
    		
    }
    }	
    });
