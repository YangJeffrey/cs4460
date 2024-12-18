// Load CSV and new GeoJSON, then render the map with insights from NFIP data
Promise.all([
    d3.csv("NfipCommunityStatusBook.csv"),
    d3.json("new-us-states.json")  // Use the new GeoJSON file
]).then(([data, geoData]) => {

    // Process the data to calculate participation stats by state
    const participationMap = new Map();

    data.forEach(d => {
        const state = d.state;
        const participating = +d.participatingInNFIP;

        if (state && participating !== undefined) {
            if (!participationMap.has(state)) {
                participationMap.set(state, { participating: 0, total: 0 });
            }

            const stateData = participationMap.get(state);
            stateData.total += 1;
            if (participating === 1) {
                stateData.participating += 1;
            }
        }
    });

    // Calculate non-participation percentage for each state
    const nonParticipationPercentageMap = new Map();
    participationMap.forEach((stateData, state) => {
        console.log(state)
        console.log(stateData.participating)
        console.log(stateData.total)
        const participationPercentage = stateData.total > 0 ? (stateData.participating / stateData.total) * 100 : 0;
        const nonParticipationPercentage = 100 - participationPercentage;
        nonParticipationPercentageMap.set(state, nonParticipationPercentage);
    });

    // Create SVG element
    const width = 800;
    const height = 500;
    const svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Set up projection and path for US map
    const projection = d3.geoAlbersUsa()
        .scale(1200)
        .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    // Define color scale with a darker starting color for 0%
    const colorScale = d3.scaleLinear()
        .domain([0, 25])
        .range(["#90d5ff", "#000435"]);

    // Draw the states
    svg.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const state = d.properties.NAME;
            const stateCode = getStateCode(state);
            const nonParticipationPercentage = nonParticipationPercentageMap.get(stateCode) || 0;
            return colorScale(nonParticipationPercentage);
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .on("mouseover", (event, d) => {
            const state = d.properties.NAME;
            const stateCode = getStateCode(state);
            const nonParticipationPercentage = nonParticipationPercentageMap.get(stateCode) || 0;
            tooltip.style("display", "block")
                .html(`<strong>${state}</strong><br>
                    Non-Participation in NFIP: ${nonParticipationPercentage.toFixed(2)}%`);
        })
        .on("mousemove", (event) => {
            // Get the mouse coordinates relative to the viewport
            const mouseX = event.clientX;
            const mouseY = event.clientY;

            // Get the tooltip dimensions
            const tooltipNode = tooltip.node();
            const tooltipWidth = tooltipNode.offsetWidth;
            const tooltipHeight = tooltipNode.offsetHeight;

            // Calculate position to prevent tooltip from going off-screen
            let left = mouseX + 10;
            let top = mouseY + 10;

            // Adjust if tooltip would go off the right side of the screen
            if (left + tooltipWidth > window.innerWidth) {
                left = mouseX - tooltipWidth - 10;
            }

            // Adjust if tooltip would go off the bottom of the screen
            if (top + tooltipHeight > window.innerHeight) {
                top = mouseY - tooltipHeight - 10;
            }

            // Apply the calculated position
            tooltip
                .style("left", `${left}px`)
                .style("top", `${top}px`);
        })
        .on("mouseout", () => {
            tooltip.style("display", "none");
        });

    // Add tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "fixed") // Changed from absolute to fixed
        .style("padding", "8px")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("border-radius", "4px")
        .style("display", "none")
        .style("pointer-events", "none"); // Prevent tooltip from interfering with mouse events

    // Add legend
    const legendWidth = 20;
    const legendHeight = 200;
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 50}, 295)`);

    const legendScale = d3.scaleLinear()
        .domain([100, 0])
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale).ticks(5);
    legend.append("g").call(legendAxis);

    legend.selectAll("rect")
        .data(d3.range(0, 9))
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", d => d * (legendHeight / 9))
        .attr("width", legendWidth)
        .attr("height", legendHeight / 9)
        .attr("fill", d => colorScale(d * (100 / 9)));

    legend.selectAll("text")
        .attr("x", 30)
        .style("text-anchor", "start")
        .style("font-size", "12px");
});

function getStateCode(stateName) {
    const stateCodes = {
        "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
        "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
        "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
        "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
        "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
        "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
        "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
        "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
        "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
        "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
    };
    return stateCodes[stateName] || stateName;
}
