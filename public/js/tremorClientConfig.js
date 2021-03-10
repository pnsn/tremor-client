//Fun config stuff yay
$.tremorDefaultConfig = {
  drawLimit: 20000, //max number of events to draw
  dateFormat: "YYYY-MM-DD", //Date format to use MUST BE SET FOR CHART AND DATEPICKER BELOW
  apiBaseUrl: "https://tremorapiv3.pnsn.org/api/v3.0", //Where to get the data from, no trailing slash
  minDate: "2009-08-06",
  mapOptions: {
    "mapContainer": 'tremor-map',
    "center": [45.5122, -122.6587],
    "zoom": 5.5,
    "boundsOptions": {
      color: '#083f08',
      weight: 2,
      fillOpacity: 0,
      opacity: 1
    },
    "markerOptions": {
      weight: 0.5,
      opacity: 1,
      fillOpacity: 0.9,
      size: 5,
    },
    "coloringOptions": {
      "numBreaks": 100,
      colors: {
        "red": {
          name: "Normal (Red)",
          type: "single",
          fill: "#ef0b25",
          outline: "black",
          default: true
        },
        "parula": {
          name: "Color by Time (Parula)",
          type: "time",
          fill: ["#352B8A", "#0760Df", "#1483D4", "#05A5C8", "#31B7A1", "#8ABE75", "#D2Ba58", "#FDC931", "#F8F80F"],
          outline: "black"
        },
        "jet": {
          name: "Color by Time (Jet)",
          type: "time",
          fill: ["#00008F", "#0000FF", "#0080FF", "#00FFFF", "#80FF80", "#FFEF00", "#FF8000", "#FF0000", "#800000"],
          outline: "black"
        },
        "magnitude": {
          name: "Color by Magnitude",
          type: "magnitude",
          fill: ["white", "yellow", "orange", "red"],
          outline: "black"
        }
      }
    },
    "leafletOptions": {
      "minZoom": 5,
      "maxZoom": 11,
      "zoomSnap": 0.25,
      "preferCanvas": true
    }
  },
  chartOptions: {
    "container": "#tremor-chart",
    "format": "YYYY-MM-DD",
    "d3Format" : "%Y-%m-%d"
  },
  datePickerOptions: {
    "showDropdowns": true,
    "autoApply": true,
    "opens": "left",
    "locale": {
      "format": "YYYY-MM-DD",
      "separator": " - ",
      "customRangeLabel": "Custom",
      "weekLabel": "W",
      "daysOfWeek": ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
      "monthNames": [
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
      ],
      "firstDay": 1
    },
    "alwaysShowCalendars": true,
    "linkedCalendars": false
  },
  tourOptions: {
    name: '7',
    backdrop: true,
    backdropPadding: 5,
    steps: [{
        title: "Welcome to the new Tremor Application!",
        content: "The old Tremor App was outdated and didn't work on newer devices, so we rebuilt it. This rebuild allows us to add new tools and make it more usable.",
        placement: "bottom",
        orphan: true
      },
      {
        element: "#chart-container",
        title: "Time Chart",
        content: "The chart shows the total counts of tremor for each day over time. You can click and drag to zoom and select a time range. If you add a geographic filter, it will update this chart to show tremor in that region.",
        placement: "bottom"
      },
      {
        element: "#date-container",
        title: "Date Selector",
        content: "Want to select a range? Click on the time range. Want to shift your time range by a day? Press the buttons to the left and right of the time range.",
        placement: "bottom"
      },
      {
        element: "#filter-container",
        title: "Geographic Filtering",
        content: "Only want to look at one region? Easy! Click 'Add Geographic Filter' and draw a region on the map.",
        placement: "left"
      },
      {
        element: "#submit",
        title: "Submitting Your Search",
        content: "Before your changes will be in effect, you must press search! After the data loads, your results will be plotted on the map and the list.",
        placement: "left"
      },
      {
        element: "#map-container",
        title: "Map",
        content: "Toggle overlays in the top right corner and zoom in or out on the top left.",
        placement: "right"
      },
      {
        element: "#search-results-container",
        title: "Search Results",
        content: "Results are rendered on the map and added to this list. Note: a maximum of 20,000 events are returned for a search but the list will not render for queries greater than 5000.",
        placement: "left"
      },
      {
        element: "#display-type-container",
        title: "Visualize",
        content: "Plot tremor by time, density, or single color.",
        placement: "left"
      },
      {
        element: "#download-container",
        title: "Download",
        content: "Want to play with the data on your own? Download your results as either GeoJSON or Comma Separated Values (CSV).",
        placement: "left",
        onShown: function () {
          $("button[data-role='next']").hide();
        }
      }
    ]
  }
};