//Fun config stuff yay
$.clientConfig = {
    drawLimit: 20000, //max number of events to draw
    dateFormat: "YYYY-MM-DD", //Date format to use MUST BE SET FOR CHART AND DATEPICKER BELOW
    apiBaseUrl: "https://tremorapi.pnsn.org/api/v1.0", //Where to get the data from
    mapOptions: {
      "mapContainer": 'tremor-map',
      "center": [45.5122, -122.6587],
      "zoom": 5.5,
      "boundsOptions" :  {
        color: '#083f08',
        weight: 2,
        fillOpacity: 0,
        opacity: 1
      },
      "markerOptions" : {
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9,
        radius: 2.75,
      },
      "coloringOptions" : {
          "numBreaks" : 100,
          "solid": {
            fill: "#ef0b25",
            outline: "#770512"
          },
          "spectrum" : {
            fill: ["#1737e5", "#14E7C8", "#2EEA11", "#ECD00E", "#ef0b25"],
            outline: ["#0B1B72", "#0A7364", "#177508", "#766807", "#770512"]
          },
          "default" : {
            fill: "white",
            outline: "black"
          }
      },
      "leafletOptions": {
        "minZoom": 5,
        "maxZoom": 11,
        "zoomSnap": 0.5,
        "preferCanvas": true
      }
    },
      chartOptions: {
        "container": "#chart",
        "height": $("#chart").height() - $("#chart-info").height(),
        "width": $("#chart").width(),
        "format": "YYYY-MM-DD"
      },
      datePickerOptions: {
        "showDropdowns": true,
        "autoApply": true,
        "opens": "left",
        // ranges: {
        //   'Today': [moment.utc(), moment.utc()],
        //   'Yesterday': [moment.utc().subtract(1, 'days'), moment.utc().subtract(1, 'days')],
        //   'Last 7 Days': [moment.utc().subtract(6, 'days'), moment.utc()],
        //   'Last 30 Days': [moment.utc().subtract(29, 'days'), moment.utc()],
        //   'This Month': [moment.utc().startOf('month'), moment.utc().endOf('month')],
        //   'Last Month': [moment.utc().subtract(1, 'month').startOf('month'), moment.utc().subtract(1, 'month').endOf('month')]
        // },
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
        "linkedCalendars": false,
        "minDate": "2009/08/06"
      },
      tourOptions: {
        name: '7',
        backdrop: true,
        backdropPadding: 5,
        steps: [{
            element: "#header-text",
            title: "Welcome to the new Tremor Application!",
            content: "The old Tremor App was out of date, so we rebuilt it. This allows us to add tools and make it more usable.",
            placement: "bottom"
          },
          {
            element: "#chart-container",
            title: "The Time Chart",
            content: "The chart shows the total counts of tremor for each day over time. You can click and drag to zoom and select a time range.",
            placement: "bottom"
          },
          {
            element: "#date-container",
            title: "This is the date selector!",
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
            title: "Searching for Tremor",
            content: "Before your changes will be in effect, you must press search! After the data loads, your results will be plotted on the map.",
            placement: "left"
          },
          {
            element: "#map-container",
            title: "The Map",
            content: "Toggle overlays in the top right corner and zoom in or out on the top left.",
            placement: "right"
          },
          {
            element: "#search-results-container",
            title: "Search Results",
            content: "Here are your results. You can change how the data is displayed on the map with the selector. Note: a maximum of 20,000 events are returned for a search (4x what the old tremor could plot)!",
            placement: "left"
          },
          {
            element: "#download-container",
            title: "Download",
            content: "Want to play with the data on your own? Download your results as either a json or csv.",
            placement: "left",
            onShown: function () {
              $("button[data-role='next']").hide();
            }
          }
        ]
      }
    };