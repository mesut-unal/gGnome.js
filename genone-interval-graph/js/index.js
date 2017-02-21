// The configuration parameters
// The Golden Ratio
var phi = 1.618;
var throttleTimer; //used for redrawing upon resize
var totalWidth, totalHeight, width, height, plotsHeight;
var margins = {top: 20, bottom: 50, left: 30, right: 30, gap: 20, bar: 10, legendFontSize: 14, legendHeight: 150, chromosomeContainerHeight: 30, chromobuttonsHeight: 30, chromoAxis: 38, legendGap: 10};
var colorScale = d3.scaleOrdinal(d3.schemeCategory10.concat(d3.schemeCategory20b));
// define the line
var line = d3.line().curve(d3.curveBasis).x(function(d) { return d[0]; }).y(function(d) { return d[1]; });
// The Data Processing part
var chromosomeBins = getChromosomeBins(data);
var metadata = data.metadata.reduce(function(hash, elem){ hash[elem.chromosome] = elem; return hash }, {});

// The actual drawing
draw();

d3.select(window).on('resize', throttle);

function draw() {
  // Clear any existing svg
  d3.select('#plot-container svg').remove();
  
  totalWidth = $('#plot-container').width();
  totalHeight = $(window).height();
  width = totalWidth - margins.left - margins.right;
  height = totalHeight - margins.top - margins.bottom;
  plotsHeight = height - margins.legendHeight - margins.gap;
  
  // The SVG hosting the visualisation
  var svg = d3.select('#plot-container').append('svg').attr('class', 'plot').attr('width', totalWidth).attr('height', totalHeight);
  
  var panels = data.metadata.slice(0,3);

  var panelContainerWidth = (width - (panels.length - 1) * margins.gap) / panels.length;

  svg.append('defs').append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('width', panelContainerWidth)
      .attr('height', plotsHeight);
  
  // Add the Brushes container
  var panelsContainer = svg.append('g')
    .attr('class', 'panels-container')
    .attr('transform', 'translate(' + [margins.left, height - plotsHeight] + ')');

  var yScale = d3.scaleLinear().domain([0, 10]).range([plotsHeight, 0]).nice();
  var yAxis = d3.axisLeft(yScale).ticks(10, 's');

  panelsContainer.append('g')
    .attr('class', 'axis axis--y')
    .attr('transform', 'translate(' + [0, 0] + ')')
    .call(yAxis);
  
  var panelContainer = panelsContainer.selectAll('g.panel-container')
    .data(panels, function(d,i) { return d.chromosome })
    .enter()
    .append('g')
    .attr('class', function(d,i) { return 'panel-container panel-' + d.chromosome })
    .attr('transform', function(d,i) { return 'translate(' + [i * (panelContainerWidth + margins.gap), 0] + ')'; })

  panelContainer.append('g')
    .attr('transform', 'translate(' + [0, 0] + ')')
    .append('rect')
    .attr('class', 'background')
    .attr('width', panelContainerWidth)
    .attr('height', plotsHeight)
    .style('fill', function(d,i) { return metadata[d.chromosome]; });

  panelContainer
    .each(function(d,i) {
      d.scale = d3.scaleLinear().domain([metadata[d.chromosome].startPoint, metadata[d.chromosome].endPoint]).range([0, panelContainerWidth]);
      d.axis = d3.axisBottom(d.scale).tickSize(-plotsHeight).ticks(10, 's');
      d.zoom = d3.zoom().scaleExtent([1, Infinity]).translateExtent([[0, 0], [panelContainerWidth, plotsHeight]]).extent([[0, 0], [panelContainerWidth, plotsHeight]]).on('zoom', function() { return zoomed(d)});
      d3.select(this).append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', 'translate(' + [0, plotsHeight] + ')')
        .call(d.axis)
      .selectAll('text')
        .attr('transform', 'rotate(45)')
      .style('text-anchor', 'start');
    });
    
  panelContainer.append('rect')
    .attr('class', 'zoom')
    .attr('width', panelContainerWidth)
    .attr('height', plotsHeight)
    .each(function(d,i) {
       d3.select(this).call(d.zoom);
     });
      
  // Add the legend
  var legendContainer = svg.append('g')
    .attr('class', 'legend-container')
    .attr('transform', 'translate(' + [margins.left, margins.top] + ')');

  var chromosomeContainer = legendContainer.selectAll('g.chromosome-container')
    .data(panels, function(d,i) { return d.chromosome})
    .enter()
    .append('g')
    .attr('class', function(d,i) { return 'chromosome-container chromosome-' + d.chromosome })
    .attr('transform', function(d,i) { return 'translate(' + [i * (panelContainerWidth + margins.gap), 0] + ')'; })
    .each(function(d,i) {
      d.scale2 = d3.scaleLinear().domain([metadata[d.chromosome].startPoint, metadata[d.chromosome].endPoint]).range([0, panelContainerWidth]).nice();
      d.axis2 = d3.axisBottom(d.scale2).ticks(10, 's');
      d3.select(this).append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', 'translate(' + [0, margins.legendHeight - margins.chromoAxis - 2] + ')')
        .call(d.axis2).selectAll('text').attr('transform', 'rotate(45)').style('text-anchor', 'start');
    });

  var chromoButtonContainer = chromosomeContainer.append('g')
    .attr('class', 'chromo-buttons-group')
    .selectAll('g.chromo-button-container')
    .data(data.metadata, function(d,i) { return d.chromosome})
    .enter()
    .append('g')
    .attr('class', 'chromo-button-container')
    .attr('transform', function(d,i) { return 'translate(' + [i * (panelContainerWidth -  margins.chromobuttonsHeight)/ (data.metadata.length - 1), ((i + 1) % 2) * margins.chromobuttonsHeight] + ')' });

  chromoButtonContainer.append('circle')
    .attr('class', 'chromo-circle')
    .attr('cx', 0.5 * margins.chromobuttonsHeight)
    .attr('cy', 0.5 * margins.chromobuttonsHeight)
    .attr('r', 0.5 * margins.chromobuttonsHeight)
    .attr('fill', function(d,i) { return d.color});

  chromoButtonContainer.append('text')
    .attr('class', 'drop-shadow')
    .attr('transform', 'translate(' + [0.5 * margins.chromobuttonsHeight, 0.5 * margins.chromobuttonsHeight] + ')')
    .attr('text-anchor', 'middle')
    .attr('dy', 0.33 * margins.legendFontSize)
    .text(function(d,i) { return d.chromosome; });

  chromoButtonContainer.append('text')
    .attr('class', 'button-text')
    .attr('transform', 'translate(' + [0.5 * margins.chromobuttonsHeight, 0.5 * margins.chromobuttonsHeight] + ')')
    .attr('text-anchor', 'middle')
    .attr('dy', 0.33 * margins.legendFontSize)
    .text(function(d,i) { return d.chromosome; });

  chromosomeContainer.append('g')
    .attr('transform', 'translate(' + [0, margins.legendHeight - margins.chromoAxis - margins.chromosomeContainerHeight - margins.legendGap] + ')')
    .append('rect')
    .attr('class', 'chromosome')
    .attr('width', panelContainerWidth)
    .attr('height', margins.chromosomeContainerHeight)
    .style('opacity', function(d,i) { return 0.8; })
    .style('fill', function(d,i) { return d.color; })
    .style('stroke', function(d,i) { return d3.rgb(d.color).darker(1); });
  
  chromosomeContainer.append('g')
    .attr('transform', 'translate(' + [0, margins.legendHeight - margins.chromoAxis - margins.chromosomeContainerHeight - margins.legendGap] + ')')
    .attr('class', function(d,i) { return 'brush brush-' + d.chromosome; })
    .each(function(d,i) {
      d.brush = d3.brushX().extent([[0, 0], [panelContainerWidth, margins.chromosomeContainerHeight]]).on('brush end', brushed);
      d3.select(this).call(d.brush).call(d.brush.move, d.scale2.range());
    });

  function drawIntervals(panel, scale, dataArray) {

    var shapes = panel.selectAll('rect.shape').data(dataArray, function(d,i) {return d.iid});

    shapes.enter().append('rect')
      .attr('class', 'shape')
      .attr('id', function(d,i) { return 'shape' + d.iid; })
      .style('clip-path','url(#clip)')
      .each(function(d,i) {
        d.startX = scale(d.startPoint);
        d.startY = yScale(d.y);
        d.endX = scale(d.endPoint);
        d.endY = yScale(d.y);
        d.intervalLength = d.endPoint - d.startPoint;
        d.popoverTitle = popoverTitle(d,i);
        d.popoverContent = popoverContent(d,i);
      })
      .attr('x', function(d,i) { return scale(d.startPoint); })
      .attr('y', function(d,i) { return yScale(d.y) - 0.5 * margins.bar; })
      .attr('width', function(d,i) { return scale(d.endPoint) - scale(d.startPoint); })
      .attr('height', margins.bar);

    shapes
      .attr('x', function(d,i) { return scale(d.startPoint); })
      .attr('y', function(d,i) { return yScale(d.y) - 0.5 * margins.bar; })
      .attr('width', function(d,i) { return scale(d.endPoint) - scale(d.startPoint); })
      .attr('height', margins.bar)

      .style('fill', function(d,i) { return metadata[d.chromosome].color; })
      .style('stroke', function(d,i) { return d3.rgb(metadata[d.chromosome].color).darker(1); })
      .on('mousemove', function(d,i) {
        var popover = d3.select('.popover');
        popover.select('.popover-title').html(d.popoverTitle);
        popover.select('.popover-content').html(d.popoverContent);
        popover.select('.popover-content span').style('color', d.color)
        popover
          .style("left", (d3.event.pageX - 0.91 *  popover.node().getBoundingClientRect().width / 2) + 'px')
          .style("top", (d3.event.pageY - popover.node().getBoundingClientRect().height - 3) + 'px')
          .classed('hidden', false)
          .style('display', 'block')
          .transition()
          .duration(5)
          .style('opacity', 1);
      });

    shapes.exit().remove();
  }
  
  function popoverTitle(d,i) {
    return 'Interval #' + d.title;
  }

  function popoverContent(d,i) {
    var content = '', label = '', value = '';
    label = 'Chromosome';
    value = d.chromosome;
    content += '<tr><td class="table-label" align="left" width="200" valign="top"><strong>' + label + ':</strong></td><td class="table-value" width="100" align="right" valign="top">' + value + '</td></tr>';
    label = 'Start Point';
    value = d3.format(',')(d.startPoint);
    content += '<tr><td class="table-label" align="left" width="200" valign="top"><strong>' + label + ':</strong></td><td class="table-value" width="100" align="right" valign="top">' + value + '</td></tr>';
    label = 'End Point';
    value = d3.format(',')(d.endPoint);
    content += '<tr><td class="table-label" align="left" width="200" valign="top"><strong>' + label + ':</strong></td><td class="table-value" width="100" align="right" valign="top">' + value + '</td></tr>';
    label = 'Interval Length';
    value = d3.format(',')(d.intervalLength);
    content += '<tr><td class="table-label" align="left" width="200" valign="top"><strong>' + label + ':</strong></td><td class="table-value" width="100" align="right" valign="top">' + value + '</td></tr>';
    label = 'Strand';
    value = d.strand;
    content += '<tr><td class="table-label" align="left" width="200" valign="top"><strong>' + label + ':</strong></td><td class="table-value" width="100" align="right" valign="top">' + value + '</td></tr>';
    return '<div class="row"><div class="col-lg-12"><table width="0" border="0" align="left" cellpadding="0" cellspacing="0"><tbody>' + content + '</tbody></table></div></div>';
  }

  // Callback when brushing is finished
  function brushed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return; // ignore brush-by-zoom
      var s = d3.event.selection || [0, panelContainerWidth];
    var brushData = d3.select(this).datum();
    var chromo = d3.select('.chromosome-' + brushData.chromosome);
    var chromoData = chromo.datum();
      var domain = s.map(chromoData.scale2.invert, chromoData.scale2);
      var panel = d3.select('.panel-' + brushData.chromosome)
      var panelData = panel.datum();
      panelData.scale.domain(domain);
      panel.select('.axis--x').call(panelData.axis).selectAll('text').attr('transform', 'rotate(45)').style('text-anchor', 'start');
    panel.select('.zoom').call(panelData.zoom.transform, d3.zoomIdentity.scale(panelContainerWidth / (s[1] - s[0])).translate(-s[0], 0));
    var intervals = data.intervals.filter(function(d,i) { return (d.chromosome === brushData.chromosome)});
      drawIntervals(panel, panelData.scale, intervals) 
  }

  function zoomed(panel) {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
    var t = d3.event.transform;
    var chromo = d3.select('.chromosome-' + panel.chromosome);
    var chromoData = chromo.datum();
    var panel = d3.select('.panel-' + panel.chromosome);
    var panelData = panel.datum();
    var domain = t.rescaleX(chromoData.scale2).domain();
    panelData.scale.domain(domain);
    panel.select('.axis--x').call(panelData.axis).selectAll('text').attr('transform', 'rotate(45)').style('text-anchor', 'start');
    chromo.select('.brush').call(chromoData.brush.move, panelData.scale.range().map(t.invertX, t));
    var intervals = data.intervals.filter(function(d,i) { return (d.chromosome === panelData.chromosome)});
    drawIntervals(panel, panelData.scale, intervals) 
  }
}

function throttle() {
  window.clearTimeout(throttleTimer);
  throttleTimer = window.setTimeout(function() {
    draw();
  }, 200);
}

// Remove any other open popovers
$(document).on('mousemove', function(event) {
  if (!$(event.target).is('.shape')) {
    d3.select('.popover').transition().duration(5)
      .style('opacity', 0);
  }
});
/*

// Add the X axis
var xAxisContainer = svg.append('g').attr('transform', 'translate(' + [margins.left, margins.top + height] + ')');
xAxisContainer.selectAll('g.axis').data(bins.values()).enter().append('g').attr('class', 'axis').each(function(d,i) { d3.select(this).call(d.axis).selectAll('text').style('text-anchor', 'end').attr('dx', '-.8em').attr('dy', '.15em').attr('transform', 'rotate(-65)'); });

// Add the Y axis
svg.append('g').attr('class', 'y axis').attr('transform', 'translate(' + [margins.left - 0 * margins.gap, margins.top] + ')').call(d3.axisLeft(yScale));

// Add the horizontal grid lines
var gridContainer = svg.append('g').attr('transform', 'translate(' + [margins.left, margins.top + height] + ')')
.selectAll('g.grid').data(domains.filter(function(d,i) { return i % 2 === 0 })).enter().append('g').attr('class', 'grid').attr('transform', function(d,i) { return 'translate(' + [xScale(d) + 0.5, 0] +')'});

gridContainer.selectAll('line.gridline').data(d3.range(yScale.domain()[1])).enter().append('line').attr('class', 'gridline').attr('transform', function(d,i) { return 'translate(' + [0, -yScale(d)] + ')'; }).attr('x2', regionWidth)

var plot = svg.append('g').attr('transform', 'translate(' + [margins.left, margins.top] + ')');
plot.selectAll('line.border').data(domains).enter().append('line').attr('class', 'border')
  .attr('transform', function(d,i) { return 'translate(' + [xScale(d) + 0.5, 0] +')'}).attr('y2', height);

plot.selectAll('rect.shape').data(json.intervals, function(d,i) {return d.id}).enter().append('rect').attr('class', 'shape')
  .attr('id', function(d,i) { return 'shape' + d.id; })
  .each(function(d,i) {
    d.startX = bins.get(d.chromosome).scale(d.startPoint);
    d.startY = yScale(d.jabba);
    d.endX = bins.get(d.chromosome).scale(d.endPoint);
    d.endY = yScale(d.jabba);
  })
  .attr('x', function(d,i) { return bins.get(d.chromosome).scale(d.startPoint); }).attr('y', function(d,i) { return yScale(d.jabba) - 0.5 * margins.bar; })
  .attr('width', function(d,i) { return bins.get(d.chromosome).scale(d.endPoint) - bins.get(d.chromosome).scale(d.startPoint); }).attr('height', margins.bar);

var connectionsContainer = svg.append('g').attr('class', 'connections-container').attr('transform', 'translate(' + [margins.left, margins.top] + ')');
connectionsContainer.selectAll('path.connection').data(json.connections.sort(function(a,b) { return d3.ascending(d3.select('#shape' + Math.abs(a.source)).datum().startX,d3.select('#shape' + Math.abs(b.sink)).datum().startX)}), function(d,i) { return d.id}).enter().append('path').attr('class', function(d,i) { return 'connection ' + d.type; })
  .each(function(d,i) {
    var startInterval = d3.select('#shape' + Math.abs(d.source)).datum();
    var endInterval = d3.select('#shape' + Math.abs(d.sink)).datum();
    var offsetY = Math.sign(startInterval.endY - endInterval.endY) * margins.bar / 1;
    if (Math.abs(d.source) === Math.abs(d.sink)) {
      d.points = [[startInterval.endX,startInterval.endY], 
            [1.05 * startInterval.endX, startInterval.endY],
            [0.5 * (startInterval.endX + endInterval.startX) + 0.25 * (endInterval.startY - startInterval.endY),
            0.5 * (endInterval.startY + startInterval.endY) - 0.25 * (endInterval.startX - startInterval.endX) ],
            [0.95 * endInterval.startX, endInterval.startY],
            [endInterval.startX, endInterval.startY]];
    } else {
      if ((d.source < 0) && (d.sink > 0)) {
        d.points = [[startInterval.endX,startInterval.endY], 
                    [1.05 * startInterval.endX, startInterval.endY - offsetY],
                    [0.95 * endInterval.startX, endInterval.startY + offsetY],
                    [endInterval.startX, endInterval.startY]];
      }
      if ((d.source < 0) && (d.sink < 0)) {
        d.points = [[startInterval.endX,startInterval.endY], 
                    [1.05 * startInterval.endX, startInterval.endY - offsetY],
                    [1.05 * endInterval.endX, endInterval.endY + offsetY],
                    [endInterval.endX, endInterval.endY]];
      }
      if ((d.source > 0) && (d.sink > 0)) {
        d.points = [[startInterval.startX,startInterval.startY], 
                    [0.95 * startInterval.startX, startInterval.startY - offsetY],
                    [0.95 * endInterval.startX, endInterval.startY + offsetY],
                    [endInterval.startX, endInterval.startY]];
      }
      if ((d.source > 0) && (d.sink < 0)) {
        d.points = [[startInterval.startX,startInterval.startY], 
                    [0.95 * startInterval.startX, startInterval.startY - offsetY],
                    [1.05 * endInterval.endX, endInterval.endY + offsetY],
                    [endInterval.endX, endInterval.endY]];
      }
    }
  })
  .attr('d', function(d,i) { return line(d.points); })
*/
