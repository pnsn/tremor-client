//Fun config stuff yay
$.clientConfig = {
    drawLimit: 20000, //max number of events to draw
    dateFormat: "YYYY-MM-DD", //Date format to use MUST BE SET FOR CHART AND DATEPICKER BELOW
    apiBaseUrl: "https://tremorapi.pnsn.org/api/v1.0", //Where to get the data from
    mapOptions: {
      "mapContainer": 'tremor-map',
      "center": [45.5122, -122.6587],
      "zoom": 5.5,
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
        "minDate": "2008/08/05"
      },
      tourOptions: {
        name: '7',
        backdrop: true,
        backdropPadding: 5,
        steps: [{
            element: "#header-text",
            title: "Welcome to the new Tremor Application!",
            content: "We rebuilt tremor!",
            placement: "bottom"
          },
          {
            element: "#chart-container",
            title: "The Time Chart",
            content: "This chart shows the total counts of tremor for each day over time. You can click and drag to zoom and select a time range.",
            placement: "bottom"
          },
          {
            element: "#date-container",
            title: "This is the date selector!",
            content: "Want to shift your time range by a day? Press the buttons to the left and right of the time range. Want to select a range? Click on the time range.",
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
            content: "Before your changes are applied, you must press search! After the data loads, you'll see your results on the map.",
            placement: "left"
          },
          {
            element: "#map-container",
            title: "The Map",
            content: "This is the map!",
            placement: "right"
          },
          {
            element: "#settings-container",
            title: "Map Settings",
            content: "Toggle overlays and change the coloring of the map.",
            placement: "left"
          },
          {
            element: "#search-results-container",
            title: "Search Results",
            content: "Here are your search results",
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