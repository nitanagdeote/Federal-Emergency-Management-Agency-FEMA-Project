// Constants
const baseUrl = 'https://raw.githubusercontent.com/nitanagdeote/Federal-Emergency-Management-Agency-FEMA-Project/refs/heads/main/data.csv';
const MARGIN = { TOP: 40, RIGHT: 30, BOTTOM: 80, LEFT: 80 };
const WIDTH = 960 - MARGIN.LEFT - MARGIN.RIGHT;
const HEIGHT = 500 - MARGIN.TOP - MARGIN.BOTTOM;
const TRANSITION_DURATION = 750;

// State
let data = [];
let currentViz = 'bar';
let currentYear = 'all';
let svg, tooltip;

// Color scales
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

// Initialize visualization
document.addEventListener('DOMContentLoaded', () => {
  tooltip = d3.select('#tooltip');
  loadData();
  setupEventListeners();
});

function loadData() {
  d3.csv(baseUrl).then(csvData => {
    data = csvData.filter(d => d.state && d.declarationDate && d.incidentType);
    
    // Parse dates
    data.forEach(d => {
      d.declarationDate = new Date(d.declarationDate);
      d.year = d.declarationDate.getFullYear();
    });
    
    // Populate year filter
    populateYearFilter();
    
    // Create initial visualization
    createVisualization();
  }).catch(error => {
    console.error('Error loading data:', error);
    document.getElementById('visualization').innerHTML = `
      <div style="color: red; text-align: center; margin-top: 50px;">
        <h3>Error loading data</h3>
        <p>${error.message}</p>
      </div>
    `;
  });
}

function populateYearFilter() {
  const years = [...new Set(data.map(d => d.year))].sort();
  const yearSelect = document.getElementById('year-filter');
  
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
}

function setupEventListeners() {
  document.getElementById('visualization-type').addEventListener('change', e => {
    currentViz = e.target.value;
    createVisualization();
  });
  
  document.getElementById('year-filter').addEventListener('change', e => {
    currentYear = e.target.value;
    createVisualization();
  });
}

function getFilteredData() {
  if (currentYear === 'all') {
    return data;
  }
  return data.filter(d => d.year == currentYear);
}

function createVisualization() {
  // Clear previous visualization
  d3.select('#visualization').html('');
  
  // Create SVG container
  svg = d3.select('#visualization')
    .append('svg')
    .attr('width', WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
    .attr('height', HEIGHT + MARGIN.TOP + MARGIN.BOTTOM)
    .append('g')
    .attr('transform', `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);
  
  // Create visualization based on current selection
  switch (currentViz) {
    case 'bar':
      createBarChart();
      break;
    case 'line':
      createLineChart();
      break;
    case 'pie':
      createPieChart();
      break;
  }
}

function createBarChart() {
  const filteredData = getFilteredData();
  
  // Group data by state
  const stateData = d3.rollup(
    filteredData,
    v => v.length,
    d => d.state
  );
  
  // Convert to array and sort
  const stateArray = Array.from(stateData, ([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Top 20 states
  
  // Set up scales
  const xScale = d3.scaleBand()
    .domain(stateArray.map(d => d.state))
    .range([0, WIDTH])
    .padding(0.2);
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(stateArray, d => d.count)])
    .range([HEIGHT, 0]);
  
  // Create axes
  const xAxis = svg.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0, ${HEIGHT})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-65)');
  
  const yAxis = svg.append('g')
    .attr('class', 'axis y-axis')
    .call(d3.axisLeft(yScale));
  
  // Add axis labels
  svg.append('text')
    .attr('class', 'axis-title')
    .attr('x', WIDTH / 2)
    .attr('y', HEIGHT + MARGIN.BOTTOM - 10)
    .attr('text-anchor', 'middle')
    .text('States');
  
  svg.append('text')
    .attr('class', 'axis-title')
    .attr('transform', 'rotate(-90)')
    .attr('x', -HEIGHT / 2)
    .attr('y', -MARGIN.LEFT + 15)
    .attr('text-anchor', 'middle')
    .text('Number of Disasters');
  
  // Create bars
  svg.selectAll('.bar')
    .data(stateArray)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.state))
    .attr('y', d => yScale(d.count))
    .attr('width', xScale.bandwidth())
    .attr('height', d => HEIGHT - yScale(d.count))
    .attr('fill', d => colorScale(d.state))
    .on('mouseover', function(event, d) {
      d3.select(this).style('opacity', 0.7);
      tooltip.style('opacity', 0.9)
        .html(`<strong>${d.state}</strong><br/>Disasters: ${d.count}`)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`);
    })
    .on('mouseout', function() {
      d3.select(this).style('opacity', 1);
      tooltip.style('opacity', 0);
    });
  
  // Add title
  svg.append('text')
    .attr('x', WIDTH / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .text(`Top 20 States by Number of Disasters ${currentYear !== 'all' ? `(${currentYear})` : ''}`);
}

function createLineChart() {
  const filteredData = getFilteredData();
  
  // Group by year and count disasters
  const yearData = d3.rollup(
    data, // Use all data to show trend over time
    v => v.length,
    d => d.year
  );
  
  // Convert to array and sort by year
  const yearArray = Array.from(yearData, ([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
  
  // Set up scales
  const xScale = d3.scaleLinear()
    .domain(d3.extent(yearArray, d => d.year))
    .range([0, WIDTH]);
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(yearArray, d => d.count)])
    .nice()
    .range([HEIGHT, 0]);
  
  // Create axes
  const xAxis = svg.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0, ${HEIGHT})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
  
  const yAxis = svg.append('g')
    .attr('class', 'axis y-axis')
    .call(d3.axisLeft(yScale));
  
  // Add axis labels
  svg.append('text')
    .attr('class', 'axis-title')
    .attr('x', WIDTH / 2)
    .attr('y', HEIGHT + MARGIN.BOTTOM - 40)
    .attr('text-anchor', 'middle')
    .text('Year');
  
  svg.append('text')
    .attr('class', 'axis-title')
    .attr('transform', 'rotate(-90)')
    .attr('x', -HEIGHT / 2)
    .attr('y', -MARGIN.LEFT + 15)
    .attr('text-anchor', 'middle')
    .text('Number of Disasters');
  
  // Create line
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.count))
    .curve(d3.curveMonotoneX);
  
  svg.append('path')
    .datum(yearArray)
    .attr('class', 'line')
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 2)
    .attr('d', line);
  
  // Add dots
  const dots = svg.selectAll('.dot')
    .data(yearArray)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d.count))
    .attr('r', 5)
    .attr('fill', 'steelblue')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('r', 8).style('fill', 'orange');
      tooltip.style('opacity', 0.9)
        .html(`<strong>Year:</strong> ${d.year}<br/><strong>Disasters:</strong> ${d.count}`)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`);
    })
    .on('mouseout', function() {
      d3.select(this).attr('r', 5).style('fill', 'steelblue');
      tooltip.style('opacity', 0);
    });
  
  // Add title
  svg.append('text')
    .attr('x', WIDTH / 2)
    .attr('y', -10)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .text('Disasters Over Time');
    
  // Highlight current year if selected
  if (currentYear !== 'all') {
    const yearPoint = yearArray.find(d => d.year == currentYear);
    if (yearPoint) {
      svg.append('circle')
        .attr('cx', xScale(yearPoint.year))
        .attr('cy', yScale(yearPoint.count))
        .attr('r', 10)
        .attr('fill', 'none')
        .attr('stroke', 'red')
        .attr('stroke-width', 2);
    }
  }
}

function createPieChart() {
  const filteredData = getFilteredData();
  
  // Group by incident type
  const typeData = d3.rollup(
    filteredData,
    v => v.length,
    d => d.incidentType || 'Unknown'
  );
  
  // Convert to array and sort
  const typeArray = Array.from(typeData, ([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  
  // Create pie chart
  const radius = Math.min(WIDTH, HEIGHT) / 2;
  
  // Move the center
  svg.attr('transform', `translate(${WIDTH / 2 + MARGIN.LEFT}, ${HEIGHT / 2 + MARGIN.TOP})`);
  
  // Generate the pie
  const pie = d3.pie()
    .value(d => d.count)
    .sort(null);
  
  // Generate the arcs
  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius * 0.8);
  
  const outerArc = d3.arc()
    .innerRadius(radius * 0.9)
    .outerRadius(radius * 0.9);
  
  // Create pie chart
  const slices = svg.selectAll('.slice')
    .data(pie(typeArray))
    .enter()
    .append('g')
    .attr('class', 'slice');
  
  // Add slices
  slices.append('path')
    .attr('d', arc)
    .attr('fill', d => colorScale(d.data.type))
    .attr('stroke', 'white')
    .style('stroke-width', '2px')
    .style('opacity', 0.7)
    .on('mouseover', function(event, d) {
      d3.select(this).style('opacity', 1);
      const percent = Math.round((d.data.count / d3.sum(typeArray, d => d.count)) * 100);
      tooltip.style('opacity', 0.9)
        .html(`<strong>${d.data.type}</strong><br/>Count: ${d.data.count}<br/>${percent}%`)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`);
    })
    .on('mouseout', function() {
      d3.select(this).style('opacity', 0.7);
      tooltip.style('opacity', 0);
    });
  
  // Add labels
  const text = slices.append('text')
    .attr('transform', d => {
      const pos = outerArc.centroid(d);
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      pos[0] = radius * 0.95 * (midAngle < Math.PI ? 1 : -1);
      return `translate(${pos})`;
    })
    .style('text-anchor', d => {
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      return midAngle < Math.PI ? 'start' : 'end';
    });
  
  text.append('tspan')
    .attr('x', 0)
    .attr('y', '-0.4em')
    .style('font-weight', 'bold')
    .text(d => d.data.type.length > 12 ? d.data.type.slice(0, 12) + '...' : d.data.type)
    .style('font-size', '12px');
  
  text.append('tspan')
    .attr('x', 0)
    .attr('y', '0.8em')
    .text(d => {
      const percent = Math.round((d.data.count / d3.sum(typeArray, d => d.count)) * 100);
      return `${percent}%`;
    })
    .style('font-size', '10px');
  
  // Add polylines
  slices.append('polyline')
    .attr('points', d => {
      const pos = outerArc.centroid(d);
      const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
      pos[0] = radius * 0.95 * (midAngle < Math.PI ? 1 : -1);
      return [arc.centroid(d), outerArc.centroid(d), pos];
    })
    .style('fill', 'none')
    .style('stroke', 'black')
    .style('opacity', 0.5)
    .style('stroke-width', '1px');
  
  // Add title
  svg.append('text')
    .attr('x', 0)
    .attr('y', -radius - 10)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .text(`Distribution of Disaster Types ${currentYear !== 'all' ? `(${currentYear})` : ''}`);
}