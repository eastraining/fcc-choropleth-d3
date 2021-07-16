Promise.all([
    fetch('https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/for_user_education.json').then(res => res.json()),
    fetch('https://cdn.freecodecamp.org/testable-projects-fcc/data/choropleth_map/counties.json').then(res => res.json())
])
.then(data => {
    const EDU_DATA = data[0];    
    const MAP_DATA = data[1];

    let SORTED_EDU_DATA = {};
    let EDU_MIN = null;
    let EDU_MAX = null;
    const EDU_COLORS = ['#FF0000', '#FF8000', '#3399FF', '#0000FF'] // test requires 4 colors min. - these four show good contrast
    EDU_DATA.forEach(item => {
        SORTED_EDU_DATA[item.fips] = item;
        EDU_MIN = !EDU_MIN ? item.bachelorsOrHigher : EDU_MIN > item.bachelorsOrHigher ? item.bachelorsOrHigher : EDU_MIN;
        EDU_MAX = !EDU_MAX ? item.bachelorsOrHigher : EDU_MAX < item.bachelorsOrHigher ? item.bachelorsOrHigher : EDU_MAX;
    });
        
    const GRAPH_PADDING = 100;
    // MAP_DATA.bbox contains the final size of the map
    const GRAPH_WIDTH = MAP_DATA.bbox[2] + GRAPH_PADDING * 2;
    const GRAPH_HEIGHT = MAP_DATA.bbox[3] + GRAPH_PADDING;
    const BAR_WIDTH = GRAPH_PADDING / 2;
    const BAR_HEIGHT = GRAPH_PADDING / 5;
    
    // graph description
    d3.select('.svgContainer')
    .append('div')
    .attr('id', 'description')
    .html(`Percentage of adults who have attained a bachelor's degree or higher in each county`); 

    // set up svg canvas
    const mainMap = d3.select('.svgContainer')
    .append('svg')
    .attr('width', GRAPH_WIDTH)
    .attr('height', GRAPH_HEIGHT);

    // set up tooltip
    const tooltip = d3.select('.svgContainer')
    .append('div')
    .attr('id', 'tooltip')
    .style('position', 'absolute')
    .style('opacity', 0);

    // set up color scale for educational attainment
    const eduColorScale = d3.scaleQuantize()
    .domain([EDU_MIN, EDU_MAX])
    .range(EDU_COLORS);

    // set up number scale to show vals for educational attainment axis
    const eduNumScale = d3.scaleOrdinal()
    .domain([...EDU_COLORS.map((d, i) => EDU_MIN + (EDU_MAX - EDU_MIN) / EDU_COLORS.length * i), EDU_MAX])
    .range([0, ...EDU_COLORS.map((d, i) => (i + 1) * BAR_WIDTH)]);

    // draw counties
    const path = d3.geoPath();
    mainMap
    .selectAll('path')
    // MAP_DATA is a topojson topology that encodes a GeoJSON FeatureCollection
    .data(topojson.feature(MAP_DATA, MAP_DATA.objects.counties).features)
    .enter()
    .append('path')
    .attr('class', 'county')
    .attr('data-fips', d => d.id)
    .attr('data-education', d => SORTED_EDU_DATA[d.id].bachelorsOrHigher)
    .attr('d', path)
    .attr('fill', d => eduColorScale(SORTED_EDU_DATA[d.id].bachelorsOrHigher))
    .attr('transform', `translate(${GRAPH_PADDING}, ${GRAPH_PADDING / 2})`)
    .on('mouseover', function(e, d) {
        d3.select(this)
        .style('stroke', 'black')
        tooltip
        .html(`${SORTED_EDU_DATA[d.id].area_name}, ${SORTED_EDU_DATA[d.id].state}<br>
        ${SORTED_EDU_DATA[d.id].bachelorsOrHigher}%`)
        .attr('data-education', this.getAttribute('data-education'))
        .style('opacity', 0.9)
        .style('left', e.clientX + 16 + 'px')
        .style('top', e.clientY - 16 + 'px');
    })
    .on('mouseout', function(e, d) {
        d3.select(this)
        .style('stroke', 'none');
        tooltip
        .style('opacity', 0)
        .style('top', 0);
    });

    // add state lines
    mainMap
    .append('path')
    .datum(topojson.mesh(MAP_DATA, MAP_DATA.objects.states, (a, b) => a !== b))
    .attr('d', path)
    .style('fill', 'none')
    .style('stroke', 'white')
    .attr('transform', `translate(${GRAPH_PADDING}, ${GRAPH_PADDING / 2})`);


    // add legend
    const LEGEND_X = GRAPH_WIDTH / 2 - BAR_WIDTH * 2
    const LEGEND_Y = 5
    const legend = mainMap
    .append('g')
    .attr('id', 'legend')
    .attr('x', LEGEND_X)
    .attr('y', LEGEND_Y)

    legend
    .selectAll('rect')
    .data(EDU_COLORS)
    .enter()
    .append('rect')
    .attr('fill', d => d)
    .attr('x', (d, i) => LEGEND_X + i * BAR_WIDTH)
    .attr('y', LEGEND_Y)
    .attr('width', BAR_WIDTH)
    .attr('height', BAR_HEIGHT);

    const eduAxis = d3.axisBottom(eduNumScale);
    legend
    .append('g')
    .attr('transform', `translate (${LEGEND_X}, ${LEGEND_Y + BAR_HEIGHT})`)
    .call(eduAxis)
    .selectAll('text')
    .text(function() { return `${this.innerHTML}%` });
})