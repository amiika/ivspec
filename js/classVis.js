
app.directive('classVisualization', function () {

    //color = d3.interpolateRgb("#f77", "#77f");

  return {
    restrict: 'E',
    scope: {
      id: '=',
      val: '=',
      loading: '='
    },
    link: function (scope, element, attrs) {
    
	var margin = {top: 0, right: 0, bottom: 0, left: 0},
    width = 800 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

    var svg = d3.select(element[0])
     .append("svg")
   	 .attr("width", width)
   	 .attr("height", height);
   	 
   	/* svg.append("rect")
   	 .attr("fill","black")
   	 .attr("x",10)
   	 .attr("y",10)
   	 .width(10)
   	 .height(10);
     */
    
     var force = d3.layout.force()
    .linkDistance(10)
    .linkStrength(1)
    .size([width, height]);
	/*
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
			 .attr('class',"loading")
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
    	*/
    	
    	scope.$watch('val',function(data) {
    		
    		if(data!==undefined) {
    	
        console.log("Starting visualization ... ");
		console.log(data);
		nodes = [];
		links = [];
		bilinks = [];
		mainNode = {id:scope.id,fill:"#000",r:5};
		nodes.push(mainNode)
		for(p in data) {
			
			/*if(data[p].object.length<1) {
			    objectNode = {id:p,fill:"#000",r:5};
				nodes.push(objectNode);
				iN = {fill:"#ffffff",r:0.5};
				nodes.push(iN);
				links.push({source: mainNode, target: iN}, {source: iN, target: objectNode});
    			bilinks.push([mainNode, iN, objectNode]);
			}*/
			
			for(object in data[p].object) {
				objectNode = {id:data[p].object[object].prefixed,fill:"#000",r:5,label:data[p].object[object].prefixed};
				nodes.push(objectNode);
				iN = {fill:"#ffffff",r:0.5,label:data[p].property.prefixed};
				nodes.push(iN);
				links.push({source: mainNode, target: iN}, {source: iN, target: objectNode});
    			bilinks.push([mainNode, iN, objectNode]);
			} 
				
			}
		
		console.log(nodes);
			
			var node = svg.selectAll(".node")
      		.data(nodes)
      		.enter();
      		
      		node.append("g");
      		
			node.append("ellipse")
			.attr("fill",function(d){ return d.fill;})
			.attr("class", "node")
			.attr("r",function(d){ return d.r})
			.attr("rx",function(d){ return d.r*2})
			.attr("ry",function(d){ return d.r});
			
			none.append("text", function(d) { return d.label; });
		
			   
  force
      .nodes(nodes)
      .links(links)
      .start();

  var link = svg.selectAll(".link")
      .data(bilinks)
    .enter().append("path")
      .attr("class", "link");

    		
    force.on("tick", function() {
    link.attr("d", function(d) {
      return "M" + d[0].x + "," + d[0].y
          + "S" + d[1].x + "," + d[1].y
          + " " + d[2].x + "," + d[2].y;
    }); 
   
   node.attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; });
        /*
   node.attr("transform", function(d) {
      return "translate(" + d.x + "," + d.y + ")";
   }); */
  });
    		
    	}
    	});
    		
    }
    }	
    });
