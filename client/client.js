Meteor.subscribe('temperatures');
Meteor.subscribe('latestTemperature');

Template.sauna.helpers({
  temperature : function() {
    return LatestTemperature.findOne();
  },
  trend : function() {
    var temperatures = Temperatures.find({}, { sort : { _id : -1 }, limit : 10 }).fetch();
    var first = temperatures[0];
    if ( temperatures.length > 9 ) {
      var last = temperatures[9];
      if ( first && last ) {
        if ( first.temperature < last.temperature ) {
	  Session.set('saunaValmis', undefined);
          return "laskeva";
        } else if ( first.temperature > last.temperature ) {
	  // lasketaan vielä milloin saunassa on +75 astetta
          // lämpötila nousee noin 5,5 astetta 9min aikana.
	  // minuutissa nousua tapahtuu noin 0,6 astetta.
	  if ( first.temperature < 75 ) {
	    var erotus = 75 - first.temperature;
	    var aika = parseInt(erotus / 0.6);
	    Session.set('saunaValmis', aika);
	  } else {
	    Session.set('saunaValmis', 0);
	  }
          return "nouseva";
        } else {
	  Session.set('saunaValmis', undefined);
          return "tasainen";
        }
      }
    }
  },
  saunaValmis : function() {
    return Session.get('saunaValmis');
  }
});

Template.registerHelper('formatDate', function(date) {
  return moment(date).format('DD.MM.YYYY HH:mm:ss');
});



Template.graafit.rendered = function() {
  var margin = { top: 20, right: 60, bottom: 60, left: 50 },
  width = 600 - margin.left - margin.right,
  height = 400 - margin.top - margin.bottom;
  
  var x = d3.time.scale().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);

  //var bisectDate = d3.bisector(function(d) { console.log(d.logged); return d.logged; }).left;

  var xAxis = d3.svg.axis().
    scale(x).
    orient('bottom').
    ticks(10).
    tickFormat(d3.time.format("%H:%M"));
  
  var yAxis = d3.svg.axis().
    scale(y).
    orient('left');
  
  /*var yGridLines = d3.svg.axis().
    scale(y).
    tickSize(-width,0,0).
    orient('left');
*/

  var line = d3.svg.line().
    x(function(d) { return x(d.logged); }).
    y(function(d) { return y(d.temperature); });
  
  var svg = d3.select('#graafi24h').
    attr('width', width + margin.left + margin.right).
    attr('height', height + margin.top + margin.bottom).
    append('g').
    attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  var focus = svg.append('g').style('display', 'none');

  function make_x_grid() {
    return d3.svg.axis().scale(x).orient('bottom').ticks(5);
  }
  
  function make_y_grid() {
    return d3.svg.axis().scale(y).orient('left').ticks(10);
  }

  svg.append("g").
    attr("class", "x axis").
    attr("transform", "translate(0," + height + ")").
    append("text").
//    attr("x", 6).
    attr("dx", "5.75em").
//    attr("y", 6).
    attr("dy", "2.5em").
    style("text-anchor", "end").
    text("Aika (HH:mm)");
  

  svg.append("g").
    attr("class", "y axis").
    append("text").
    attr('transform', 'translate('+margin.left+',0)').
    attr("transform", "rotate(-90)").
//    attr("y", 6).
    attr("dy", "-2.71em").
    style("text-anchor", "end").
    text("Lämpötila (°C)");

  svg.append('g').
    attr('class', 'grid').
    attr('transform', 'translate(0,' + height + ')').
    call(make_x_grid().tickSize(-height, 0, 0).tickFormat(""));

  svg.append('g').
    attr('class', 'grid').
    call(make_y_grid().tickSize(-width, 0, 0).tickFormat(""));

  Tracker.autorun(function() {
    //var start = moment().subtract(24, 'hours').valueOf();
    //var temperatures = Temperatures.find({logged : {$gte : start}}, { sort : { _id : -1 } }).fetch();
    var temperatures = Temperatures.find({}, { sort : { logged : -1 } }).fetch();

    if ( temperatures ) {
      /*for ( i = 0; i < temperatures.length; ++i ) {
	if( temperatures[i].temperature > 84 ) {
	  if ( i > 0 ) {
	    temperatures[i].temperature = temperatures[i-1].temperature;
	  } else {
	    temperatures[i] = temperatures[i+1].temperature;
	  }
	}
      } */     
      var paths = svg.selectAll("path.line").
	data([temperatures]);
      
      x.domain(d3.extent(temperatures, function(d) { return d.logged; }));
      y.domain([0, 100]);//d3.extent(temperatures, function(d) { return d.temperature; }));
      
      var puolitushaku = function(taulu, haettava, vasen, oikea) {
	//console.log(taulu);
	while ( vasen <= oikea ) {
	  var keski = parseInt(vasen + ( ( oikea - vasen ) / 2 ) );
	  console.log(keski);
	  var arvo = taulu[keski];
	  console.log(arvo);
	  var logged = arvo["logged"];
	  console.log(logged);
	  if ( logged == haettava ) {
	    return keski;
	  }
	  if ( haettava < logged ) {
	    oikea = keski - 1;
	  } else {
	    vasen = keski + 1;
	  }
	}
	return null;
      }

      function mousemove() {
	var x0 = moment(x.invert(d3.mouse(this)[0])).valueOf();

	var indeksi = 0;
	//puolitushaku(temperatures, x0, 0, temperatures.length - 1);
	
	for ( i = 0; i < temperatures.length; ++i ) {
	  if ( i > 0 ) {
	    if ( temperatures[i-1].logged > x0 && temperatures[i].logged <= x0 ) {
	      indeksi = i;
	      break;
	    }
	  } else {
	    if ( temperatures[i].logged > x0 && temperatures[i+1].logged <= x0 ) {
	      indeksi = i + 1;
	      break;
	    }
	  }
	}

	var d = temperatures[indeksi];
	var formatDate = d3.time.format('%H:%M');
	focus.select('circle.y').attr('transform',
				      'translate(' + x(d.logged) + ',' +
				      y(d.temperature) + ')');

	focus.select("text.y1")
	  .attr("transform",
		"translate(" + x(d.logged) + "," +
                y(d.temperature) + ")")
	  .text(d.temperature);
	
	focus.select("text.y2")
	  .attr("transform",
		"translate(" + x(d.logged) + "," +
                y(d.temperature) + ")")
	  .text(d.temperature);
	
	focus.select("text.y3")
	  .attr("transform",
		"translate(" + x(d.logged) + "," +
		y(d.temperature) + ")")
	  .text(formatDate(new Date(d.logged)));
	
	focus.select("text.y4")
	  .attr("transform",
		"translate(" + x(d.logged) + "," +
		y(d.temperature) + ")")
	  .text(formatDate(new Date(d.logged)));
	
	
      }

      focus.append('circle').attr('class','y').style('fill','none').style('stroke','blue').attr('r',4);
      
      // append the rectangle to capture mouse               // **********
      svg.append("rect")                                     // **********
	.attr("width", width)                              // **********
	.attr("height", height)                            // **********
	.style("fill", "none")                             // **********
	.style("pointer-events", "all")                    // **********
	.on("mouseover", function() { focus.style("display", null); })
	.on("mouseout", function() { focus.style("display", "none"); })
	.on("mousemove", mousemove);
      
      focus.append("text")
        .attr("class", "y1")
        .style("stroke", "white")
        .style("stroke-width", "3.5px")
        .style("opacity", 0.8)
        .attr("dx", 8)
        .attr("dy", "-.3em");
      focus.append("text")
        .attr("class", "y2")
        .attr("dx", 8)
        .attr("dy", "-.3em");

      focus.append("text")
        .attr("class", "y3")
        .style("stroke", "white")
        .style("stroke-width", "3.5px")
        .style("opacity", 0.8)
        .attr("dx", 8)
        .attr("dy", "1em");
      focus.append("text")
        .attr("class", "y4")
        .attr("dx", 8)
        .attr("dy", "1em");



      svg.select(".x.axis").
	transition().
	duration(1000).
	call(xAxis);
      
      svg.select(".y.axis").
	transition().
	duration(1000).
	call(yAxis);
      
      paths.
	enter().
	append("path").
	attr("class", "line").
	attr("d", line);
	
      paths.
	attr("d", line);
      
      paths.
	exit().
	remove();
    }
  });
};

